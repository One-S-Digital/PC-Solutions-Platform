import { UserManagementService } from './user-management.service';

const makeUser = (over: Record<string, any> = {}) => ({
  id: 'u1',
  email: 'a@example.com',
  firstName: 'Ana',
  lastName: 'O"Neil',
  role: 'EDUCATOR',
  isActive: true,
  createdAt: new Date('2026-01-02T03:04:05.000Z'),
  lastActiveAt: null,
  organizations: [{ organization: { name: 'Kita, Nord' } }],
  ...over,
});

describe('UserManagementService.exportUsers', () => {
  const findMany = jest.fn();
  const service = new UserManagementService(
    { user: { findMany } } as any,
    { log: jest.fn(), error: jest.fn() } as any,
  );

  beforeEach(() => findMany.mockReset());

  it('exports a selection by id and ignores filters', async () => {
    findMany.mockResolvedValue([makeUser()]);
    await service.exportUsers({ userIds: ['u1'], filters: { role: 'PARENT' as any } });
    expect(findMany.mock.calls[0][0].where).toEqual({ id: { in: ['u1'] } });
  });

  it('applies role/search filters when nothing is selected', async () => {
    findMany.mockResolvedValue([]);
    await service.exportUsers({ filters: { role: 'EDUCATOR' as any, search: 'ana' } });
    const where = findMany.mock.calls[0][0].where;
    expect(where.role).toBe('EDUCATOR');
    expect(where.OR).toHaveLength(3);
  });

  it('escapes quotes and neutralises formulas in CSV', async () => {
    findMany.mockResolvedValue([makeUser({ firstName: '=HYPERLINK("x")' })]);
    const res = await service.exportUsers({ format: 'csv' });
    const text = res.buffer.toString('utf8');
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text).toContain('"\'=HYPERLINK(""x"")"');
    expect(text).toContain('"O""Neil"');
    expect(text).toContain('"Kita, Nord"');
    expect(res.contentType).toContain('text/csv');
    expect(res.count).toBe(1);
  });

  it('neutralises formulas hidden behind leading whitespace', async () => {
    findMany.mockResolvedValue([makeUser({ firstName: ' =1+1', lastName: '\t@SUM(A1)' })]);
    const text = (await service.exportUsers({ format: 'csv' })).buffer.toString('utf8');
    expect(text).toContain('"\' =1+1"');
    expect(text).toContain('"\'\t@SUM(A1)"');
  });

  it('rejects an explicitly empty selection instead of exporting everyone', async () => {
    await expect(service.exportUsers({ userIds: [] })).rejects.toThrow(/at least one/);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('rejects filtered exports that would be truncated', async () => {
    findMany.mockResolvedValue(Array.from({ length: 50001 }, (_, i) => makeUser({ id: `u${i}` })));
    await expect(service.exportUsers({ filters: {} })).rejects.toThrow(/narrow the filters/);
    expect(findMany.mock.calls[0][0].take).toBe(50001);
  });

  it('rejects oversized selections', async () => {
    const ids = Array.from({ length: 50001 }, (_, i) => `u${i}`);
    await expect(service.exportUsers({ userIds: ids })).rejects.toThrow(/more than/);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('produces a valid XLSX workbook', async () => {
    findMany.mockResolvedValue([
      makeUser({ firstName: '=HYPERLINK("x")' }),
      makeUser({ id: 'u2', isActive: false }),
    ]);
    const res = await service.exportUsers({ format: 'xlsx' });
    expect(res.filename).toMatch(/\.xlsx$/);
    expect(res.buffer.subarray(0, 2).toString()).toBe('PK');
    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(res.buffer);
    const sheet = wb.getWorksheet('Users');
    expect(sheet.rowCount).toBe(3);
    expect(sheet.getRow(2).getCell(3).value).toBe("'=HYPERLINK(\"x\")");
    expect(sheet.getRow(3).getCell(6).value).toBe('Inactive');
  });
});
