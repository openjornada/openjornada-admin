# Contributing to OpenTracker Frontend

Thank you for your interest in contributing to this OpenTracker frontend component!

> **Note**: This is part of the [OpenTracker Project](https://bitbucket.org/[YOUR-WORKSPACE]/projects/OPENTRACKER).
> For general project information and documentation, see [opentracker-core](https://bitbucket.org/[YOUR-WORKSPACE]/opentracker-core).

## 📋 Quick Links

- [Main Project Documentation](https://bitbucket.org/[YOUR-WORKSPACE]/opentracker-core/src/main/docs/)
- [General Contributing Guidelines](https://bitbucket.org/[YOUR-WORKSPACE]/opentracker-core/src/main/CONTRIBUTING.md)
- [Architecture Documentation](https://bitbucket.org/[YOUR-WORKSPACE]/opentracker-core/src/main/docs/ARCHITECTURE.md)

## 🚀 Development Setup

### Prerequisites

- Node.js 20+
- npm or yarn
- Git

### Local Setup

```bash
# Clone this repository
git clone git@bitbucket.org:[YOUR-WORKSPACE]/[REPO-NAME].git
cd [REPO-NAME]

# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run development server
npm run dev

# Open in browser
# http://localhost:3000 (Admin/Portal)
# http://localhost:5173 (Webapp/Landing)
```

### Build for Production

```bash
npm run build
npm run start  # For Next.js apps
npm run preview  # For Vite apps
```

## 📝 Coding Standards for React/TypeScript

### Style Guide

- **Use TypeScript**: All new code should be TypeScript
- **Functional Components**: Use functional components with hooks
- **Props Interface**: Define interfaces for all component props
- **ESLint**: Follow ESLint rules, run before committing
- **Naming Conventions**:
  - Components: PascalCase (`UserProfile.tsx`)
  - Files: kebab-case for utilities (`api-client.ts`)
  - Variables/functions: camelCase (`fetchUserData`)

### Component Structure

```typescript
// Good example
import { useState, useEffect } from 'react';
import { User } from '@/types';

interface UserProfileProps {
  userId: string;
  onUpdate?: (user: User) => void;
}

/**
 * UserProfile component displays user information.
 *
 * @param userId - The ID of the user to display
 * @param onUpdate - Callback when user is updated
 */
export function UserProfile({ userId, onUpdate }: UserProfileProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getUser(userId);
      setUser(data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!user) return <ErrorMessage message="User not found" />;

  return (
    <div className="user-profile">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
```

### TypeScript Best Practices

1. **Define types explicitly**:
```typescript
// Good
interface TimeRecord {
  id: string;
  type: 'entry' | 'exit' | 'pause_start' | 'pause_end';
  created_at: string;
  worker_id: string;
}

// Bad - using 'any'
const record: any = { ... };
```

2. **Use type guards**:
```typescript
function isErrorResponse(response: unknown): response is ErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response
  );
}
```

3. **Avoid non-null assertions** when possible:
```typescript
// Good
if (user?.email) {
  sendEmail(user.email);
}

// Avoid
sendEmail(user!.email);
```

### React Best Practices

1. **Use custom hooks for logic reuse**:
```typescript
function useTimeRecords(workerId: string) {
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords();
  }, [workerId]);

  const loadRecords = async () => {
    // Implementation
  };

  return { records, loading, refetch: loadRecords };
}
```

2. **Memoize expensive computations**:
```typescript
const sortedRecords = useMemo(
  () => records.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ),
  [records]
);
```

3. **Use proper dependency arrays**:
```typescript
// Good - all dependencies listed
useEffect(() => {
  fetchData(userId, companyId);
}, [userId, companyId]);
```

### Styling

- **Tailwind CSS**: Use utility classes
- **Component styles**: Use CSS modules for component-specific styles
- **Consistency**: Follow existing design patterns

```typescript
// Good - Tailwind classes
<button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
  Click me
</button>
```

## 🧪 Testing

### Unit Tests

```typescript
// Component.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { UserProfile } from './UserProfile';

describe('UserProfile', () => {
  it('renders user information', async () => {
    render(<UserProfile userId="123" />);

    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('calls onUpdate when save is clicked', async () => {
    const handleUpdate = jest.fn();
    render(<UserProfile userId="123" onUpdate={handleUpdate} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    expect(handleUpdate).toHaveBeenCalledTimes(1);
  });
});
```

### Run Tests

```bash
npm run test           # Run tests
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage
```

## 🔄 Pull Request Process

1. Create a feature branch: `git checkout -b feature/improve-ui`
2. Make your changes following the coding standards
3. Add tests for your changes
4. Run linting: `npm run lint`
5. Build successfully: `npm run build`
6. Commit with clear messages: `feat: improve time records table UI`
7. Push to your fork: `git push origin feature/improve-ui`
8. Create a Pull Request in Bitbucket
9. Link relevant Jira issues (e.g., "OT-456")

### PR Checklist

- [ ] Code follows TypeScript and React best practices
- [ ] ESLint passes without errors
- [ ] Components have proper TypeScript types
- [ ] Tests are added and passing
- [ ] Build succeeds without warnings
- [ ] UI is responsive (mobile, tablet, desktop)
- [ ] AGPL-3.0 license headers in new files
- [ ] Bitbucket Pipeline passes

## ⚖️ License Agreement

By contributing to this OpenTracker component, you agree that:

1. Your contributions will be licensed under **AGPL-3.0**
2. You have the right to contribute the code
3. All new source files must include the license header:

```typescript
/*
 * OpenTracker - Sistema de Registro de Jornada Laboral
 * Copyright (C) 2024 OpenTracker Contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 */
```

## 🐛 Debugging

### Browser DevTools
- Use React DevTools extension
- Check Console for errors
- Use Network tab for API calls

### VS Code Debug Configuration

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

## 💬 Communication

- **Bitbucket Issues**: Bug reports and feature requests
- **Pull Requests**: Code review and discussions
- **Jira**: Task tracking (link issues with OT-XXX)

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

Thank you for contributing to OpenTracker! 🚀

For questions specific to this component, open an issue in this repository.
For general project questions, see [opentracker-core](https://bitbucket.org/[YOUR-WORKSPACE]/opentracker-core).
