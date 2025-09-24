const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create a temporary schema file with a dummy DATABASE_URL
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const tempSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.temp.prisma');

// Read the original schema
const schema = fs.readFileSync(schemaPath, 'utf8');

// Replace the DATABASE_URL with a dummy one for migration generation
const tempSchema = schema.replace(
  'url      = env("DATABASE_URL")',
  'url      = "postgresql://user:password@localhost:5432/mydb"'
);

// Write the temporary schema
fs.writeFileSync(tempSchemaPath, tempSchema);

try {
  // Generate migration using the temporary schema
  execSync('npx prisma migrate dev --name init --create-only --schema=./prisma/schema.temp.prisma', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('Migration created successfully!');
} catch (error) {
  console.error('Failed to create migration:', error);
} finally {
  // Clean up temporary schema
  fs.unlinkSync(tempSchemaPath);
}