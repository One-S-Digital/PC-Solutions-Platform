import '@testing-library/jest-dom';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';

// `t` falls back to the default text in the component, which is all these tests
// need: they are about behaviour, not wording (translations have their own test).
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

// FileUploadZone reaches for Clerk through this hook; uploads are not under test.
vi.mock('../../hooks/useAuthenticatedApi', () => ({
  useAuthenticatedApi: () => ({ upload: async () => ({ success: false }) }),
}));

import EducatorProfileStep, {
  type EducatorProfileStepData,
} from '../../components/signup/EducatorProfileStep';
import FileUploadZone from '../../components/ui/FileUploadZone';

type Props = React.ComponentProps<typeof EducatorProfileStep>;

const scrollIntoView = vi.fn();

function mount(overrides: Partial<Props> = {}) {
  const onSubmit = vi.fn(async (_data: EducatorProfileStepData) => undefined);
  const props: Props = {
    initialData: { email: 'educator@example.com' },
    onSubmit,
    onBack: vi.fn(),
    isLoading: false,
    accountExists: true,
    ...overrides,
  };
  const view = render(React.createElement(EducatorProfileStep, props));
  const form = view.container.querySelector('form') as HTMLFormElement;
  return { ...view, form, onSubmit, props };
}

const byIdSuffix = (container: HTMLElement, suffix: string) =>
  container.querySelector(`[id$="-${suffix}"]`) as HTMLElement;

const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });

/** Fill every required field except the ones named in `skip`. */
function fill(container: HTMLElement, skip: string[] = []) {
  const values: Record<string, string> = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    phone: '+41 79 000 00 00',
    city: 'Lausanne',
    shortBio: 'I love early childhood education.',
    professionalExperience: 'Ten years in a Lausanne daycare.',
  };
  for (const [field, value] of Object.entries(values)) {
    if (!skip.includes(field)) type(byIdSuffix(container, field), value);
  }
  if (!skip.includes('canton')) {
    const select = byIdSuffix(container, 'canton') as HTMLSelectElement;
    type(select, select.options[1].value);
  }
  if (!skip.includes('jobRole')) {
    fireEvent.click(byIdSuffix(container, 'jobRole').querySelector('button') as HTMLElement);
  }
}

const submit = (form: HTMLFormElement) => act(() => void fireEvent.submit(form));

beforeEach(() => {
  // The step saves a draft as the user types, into BOTH stores; a leftover one
  // would pre-fill the next test's form.
  window.localStorage.clear();
  window.sessionStorage.clear();
  scrollIntoView.mockReset();
  // jsdom implements neither of these.
  window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
  window.matchMedia = undefined as unknown as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/**
 * Step 3 is two to three screens tall on a phone with its submit button at the
 * bottom. Measured at 375x667: pressing submit on an empty form raised 7 errors
 * and left 2 of them on screen, with focus still on the button — so the press
 * looked like it did nothing. Two of five educators in the signup log left
 * within 50 seconds of arriving here.
 */
describe('EducatorProfileStep — failed submit', () => {
  it('takes the user to the first invalid field and focuses it', () => {
    const { container, form, onSubmit } = mount();
    submit(form);

    const firstName = byIdSuffix(container, 'firstName');
    expect(document.activeElement).toBe(firstName);
    expect(scrollIntoView).toHaveBeenCalled();
    expect(scrollIntoView.mock.contexts[0]).toBe(firstName);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('moves down the form as fields are fixed, in on-screen order', () => {
    const { container, form } = mount();

    fill(container, ['canton', 'city', 'jobRole', 'shortBio', 'professionalExperience']);
    submit(form);
    expect(document.activeElement).toBe(byIdSuffix(container, 'canton'));

    fill(container, ['jobRole', 'shortBio', 'professionalExperience']);
    submit(form);
    expect(document.activeElement).toBe(byIdSuffix(container, 'jobRole'));

    fill(container, ['shortBio', 'professionalExperience']);
    submit(form);
    expect(document.activeElement).toBe(byIdSuffix(container, 'shortBio'));
  });

  it('ends on the CV when it is the only thing missing', () => {
    const { container, form, onSubmit } = mount();
    fill(container);
    submit(form);

    const cv = byIdSuffix(container, 'cvUrl');
    expect(document.activeElement).toBe(cv);
    expect(cv).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('ties each error message to its field for screen readers', () => {
    const { container, form } = mount();
    submit(form);

    const firstName = byIdSuffix(container, 'firstName');
    const errorId = firstName.getAttribute('aria-describedby');
    expect(firstName).toHaveAttribute('aria-invalid', 'true');
    expect(errorId).toBeTruthy();
    expect(document.getElementById(errorId as string)).toHaveTextContent('First name is required');
  });

  it('submits once everything is filled in', () => {
    const { container, form, onSubmit } = mount({
      initialData: { email: 'educator@example.com', cvUrl: 'https://files.example/cv.pdf' },
    });
    fill(container);
    submit(form);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ firstName: 'Ada', cvUrl: 'https://files.example/cv.pdf' });
  });

  it('skips the smooth scroll for people who ask for reduced motion', () => {
    window.matchMedia = ((q: string) => ({ matches: q.includes('reduce') })) as typeof window.matchMedia;
    const { form } = mount();
    submit(form);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' });
  });
});

describe('EducatorProfileStep — failed save', () => {
  it('brings the save-failed banner into view, because the button pressed is far below it', () => {
    const { rerender, props, container } = mount();
    expect(scrollIntoView).not.toHaveBeenCalled();

    rerender(React.createElement(EducatorProfileStep, { ...props, submitError: 'Network down' }));

    const banner = container.querySelector('[role="alert"]') as HTMLElement;
    expect(banner).toHaveTextContent('Network down');
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(banner);
  });
});

describe('EducatorProfileStep — fields', () => {
  it('links every label to its input, so tapping a label focuses the field', () => {
    const { container } = mount();
    const labels = Array.from(container.querySelectorAll('label'));
    expect(labels.length).toBeGreaterThanOrEqual(6);

    for (const label of labels) {
      const target = label.htmlFor ? document.getElementById(label.htmlFor) : null;
      expect(target, `label "${label.textContent}" points at nothing`).not.toBeNull();
    }
  });

  it('labels the free-text areas, which have a heading rather than a <label>', () => {
    const { container } = mount();
    for (const field of ['shortBio', 'professionalExperience']) {
      const area = byIdSuffix(container, field);
      const heading = document.getElementById(area.getAttribute('aria-labelledby') as string);
      expect(heading?.textContent?.length).toBeGreaterThan(0);
    }
  });

  it('tells the browser what each field is, so a phone can autofill it', () => {
    const { container } = mount();
    expect(byIdSuffix(container, 'firstName')).toHaveAttribute('autocomplete', 'given-name');
    expect(byIdSuffix(container, 'lastName')).toHaveAttribute('autocomplete', 'family-name');
    expect(byIdSuffix(container, 'phone')).toHaveAttribute('autocomplete', 'tel');
    expect(byIdSuffix(container, 'email')).toHaveAttribute('autocomplete', 'email');
    expect(byIdSuffix(container, 'city')).toHaveAttribute('autocomplete', 'address-level2');
  });

  it('marks the selected profile type for assistive tech', () => {
    const { container } = mount();
    const buttons = Array.from(byIdSuffix(container, 'jobRole').querySelectorAll('button'));
    expect(buttons.every(b => b.getAttribute('aria-pressed') === 'false')).toBe(true);
    fireEvent.click(buttons[0]);
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('EducatorProfileStep — actions', () => {
  it('puts the submit button first, so "Sign out" is never the one right above it on a phone', () => {
    const { container } = mount();
    const submitButton = container.querySelector('button[type="submit"]') as HTMLElement;
    const backButton = Array.from(container.querySelectorAll('button[type="button"]')).find(b =>
      /Sign Out/i.test(b.textContent ?? ''),
    ) as HTMLElement;

    expect(backButton).toBeTruthy();
    expect(
      submitButton.compareDocumentPosition(backButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // The row layout from the sm breakpoint up must restore the left/right order.
    expect(submitButton.parentElement?.className).toContain('sm:flex-row-reverse');
  });
});

describe('FileUploadZone — drag-and-drop hint', () => {
  const DRAG_HINT = 'common:fileUploadZone.dragAndDrop';

  it('offers drag and drop on a device with a mouse', () => {
    window.matchMedia = ((q: string) => ({ matches: q.includes('fine') })) as typeof window.matchMedia;
    const { queryByText } = render(React.createElement(FileUploadZone, { label: 'Select your CV' }));
    expect(queryByText(DRAG_HINT)).not.toBeNull();
  });

  it('drops it on a touch device, where nobody can drag a file', () => {
    window.matchMedia = ((q: string) => ({ matches: q.includes('coarse') })) as typeof window.matchMedia;
    const { queryByText } = render(React.createElement(FileUploadZone, { label: 'Select your CV' }));
    expect(queryByText('Select your CV')).not.toBeNull();
    expect(queryByText(DRAG_HINT)).toBeNull();
  });

  it('keeps the hint when the browser cannot say', () => {
    const { queryByText } = render(React.createElement(FileUploadZone, { label: 'Select your CV' }));
    expect(queryByText(DRAG_HINT)).not.toBeNull();
  });
});
