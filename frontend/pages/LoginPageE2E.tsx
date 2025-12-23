import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { APP_NAME, STANDARD_INPUT_FIELD } from '../constants';

/**
 * E2E-only login page.
 *
 * Purpose: allow Playwright tests to run without external Clerk/backend dependencies.
 */
const LoginPageE2E: React.FC = () => {
  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 shadow-xl">
        {/* Keep test-friendly, case-sensitive branding strings */}
        <h1 className="text-2xl font-bold text-swiss-charcoal mb-2">sign in</h1>
        <p className="text-sm text-gray-600 mb-6">
          {APP_NAME} (Pro-crèche)
        </p>

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
          {/* Use input[type=submit] so Playwright locator('form, ..., button') matches a single element */}
          <input
            type="submit"
            value="Log in"
            className="inline-flex items-center justify-center font-semibold rounded-button focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed shadow-minimal hover:shadow-interactive bg-swiss-mint text-white hover:bg-opacity-90 focus:ring-swiss-mint px-5 py-2.5 text-sm w-full"
          />
        </form>

        <div className="mt-5 text-sm text-gray-600 space-y-2">
          <p>
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-swiss-mint hover:underline font-medium">
              Sign up
            </Link>
          </p>
          <p>
            Want to see our plans?{' '}
            <Link to="/pricing" className="text-swiss-mint hover:underline font-medium">
              View plans
            </Link>
          </p>
          <p>
            Parent looking for a crèche?{' '}
            <Link to="/parent-lead-form" className="text-swiss-teal hover:underline font-medium">
              Find your perfect crèche here
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default LoginPageE2E;

