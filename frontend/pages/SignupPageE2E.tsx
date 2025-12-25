import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { APP_NAME, STANDARD_INPUT_FIELD } from '../constants';

/**
 * E2E-only signup page.
 *
 * Purpose: allow Playwright tests to run without external Clerk/backend dependencies.
 */
const SignupPageE2E: React.FC = () => {
  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-swiss-charcoal mb-2">Sign up</h1>
        <p className="text-sm text-gray-600 mb-6">{APP_NAME}</p>

        <div data-testid="role-selection" className="mb-4 text-sm text-gray-600">
          Choose your role
        </div>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" className={STANDARD_INPUT_FIELD} placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
              Password
            </label>
            <input id="password" name="password" type="password" className={STANDARD_INPUT_FIELD} placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full">
            Create account
          </Button>
        </form>

        <div className="mt-5 text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-swiss-mint hover:underline font-medium">
            Log in
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default SignupPageE2E;

