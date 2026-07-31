/**
 * Mock Data - Realistic test data matching the API response structure
 * This data mirrors what the real backend would return
 */

// Current timestamp helpers
const now = new Date();
const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
const hoursAgo = (hours) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

// Mock Users
export const mockUsers = [
  {
    _id: 'user_1',
    username: 'nguyenvan_a',
    email: 'nguyenvan.a@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nguyenvan_a',
    bio: 'Fullstack developer | React & Node.js enthusiast | Coffee addict ☕',
    role: 'USER',
    violationScore: 0,
    isMuted: false,
    isBanned: false,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(5),
    followersCount: 234,
    followingCount: 156,
    postsCount: 42,
  },
  {
    _id: 'user_2',
    username: 'tran_thi_b',
    email: 'tran.thi.b@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tran_thi_b',
    bio: 'UI/UX Designer | Design systems advocate | Figma expert',
    role: 'USER',
    violationScore: 0,
    isMuted: false,
    isBanned: false,
    createdAt: daysAgo(95),
    updatedAt: daysAgo(2),
    followersCount: 567,
    followingCount: 89,
    postsCount: 28,
  },
  {
    _id: 'user_3',
    username: 'le_van_c',
    email: 'le.van.c@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=le_van_c',
    bio: 'Backend engineer | Go, Rust, distributed systems | Tech blogger',
    role: 'ADMIN',
    violationScore: 0,
    isMuted: false,
    isBanned: false,
    createdAt: daysAgo(200),
    updatedAt: daysAgo(1),
    followersCount: 1203,
    followingCount: 234,
    postsCount: 89,
  },
  {
    _id: 'user_4',
    username: 'pham_thi_d',
    email: 'pham.thi.d@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pham_thi_d',
    bio: 'DevOps & Cloud | Kubernetes | AWS certified | Open source contributor',
    role: 'USER',
    violationScore: 1,
    isMuted: false,
    isBanned: false,
    createdAt: daysAgo(60),
    updatedAt: hoursAgo(3),
    followersCount: 342,
    followingCount: 198,
    postsCount: 15,
  },
  {
    _id: 'user_5',
    username: 'hoang_van_e',
    email: 'hoang.van.e@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hoang_van_e',
    bio: 'Mobile dev | Flutter & React Native | Building cool apps 📱',
    role: 'USER',
    violationScore: 0,
    isMuted: false,
    isBanned: false,
    createdAt: daysAgo(45),
    updatedAt: hoursAgo(12),
    followersCount: 189,
    followingCount: 134,
    postsCount: 33,
  },
];

// Current user (for auth context)
export const mockCurrentUser = mockUsers[0];

// Mock Posts
export const mockPosts = [
  {
    _id: 'post_1',
    title: 'Xây dựng Design System từ con số 0: Hành trình 6 tháng của team chúng tôi',
    slug: 'xay-dung-design-system-tu-con-so-0',
    content: `Design System không chỉ là một bộ component library. Đó là một **ngôn ngữ chung** giữa designers và developers, một "source of truth" cho toàn bộ tổ chức.

## Tại sao chúng tôi quyết định build Design System?

Sau 2 năm phát triển sản phẩm, chúng tôi nhận ra:
- Inconsistent UI across các pages
- Developers tự viết CSS dẫn đến duplication
- Designers phải spec lại cùng một component nhiều lần
- Onboarding new members mất quá nhiều thời gian

## Quy trình 6 tháng

### Tháng 1-2: Audit & Research
- Inventory tất cả components đang dùng (147 components!)
- Phỏng vấn 12 designers + 8 developers
- Research: Material Design, Ant Design, Shopify Polaris, Vercel Design System

### Tháng 3-4: Foundation & Core Components
- Design tokens: colors, spacing, typography, shadows, border-radius
- Core components: Button, Input, Card, Modal, Tooltip, Dropdown
- Storybook documentation với interactive controls
- Automated visual regression testing với Chromatic

### Tháng 5-6: Migration & Adoption
- Codemod scripts để migrate existing codebase
- Office hours hàng tuần để support team
- Migration guide với examples
- Metrics tracking: adoption rate, bundle size, dev velocity

## Kết quả

| Metric | Trước | Sau | Cải thiện |
|--------|-------|-----|-----------|
| Component duplication | 47% | 3% | **93% giảm** |
| Time to build new page | 4h | 1.5h | **62% nhanh hơn** |
| Design handoff issues | 12/sprint | 2/sprint | **83% giảm** |
| Bundle size (components) | 245KB | 187KB | **24% nhẹ hơn** |

## Lessons Learned

1. **Start small** - Đừng cố build tất cả cùng lúc
2. **Design tokens first** - Foundation quyết định mọi thứ sau này
3. **Developer experience** - Nếu DX kém, team sẽ không adopt
4. **Governance** - Ai approve component mới? Ai maintain?
5. **Versioning** - Semantic versioning + breaking change policy

## Kết luận

Design System là một **product**, không phải project. Cần maintain, iterate, và support như một product thật sự.

*Team chúng tôi đang hiring! Nếu bạn quan tâm đến Design Systems, hãy reach out nhé.* 👋`,
    excerpt: 'Design System không chỉ là một bộ component library. Đó là một ngôn ngữ chung giữa designers và developers...',
    coverImage: 'https://images.unsplash.com/photo-1558655146-9f40138eddea?w=1200&q=80',
    cover_image: 'https://images.unsplash.com/photo-1558655146-9f40138eddea?w=1200&q=80',
    author: mockUsers[0],
    tags: ['design-system', 'react', 'frontend', 'architecture', 'team-process'],
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    isSensitive: false,
    is_sensitive: false,
    likeCount: 234,
    likesCount: 234,
    commentCount: 42,
    bookmarkCount: 189,
    bookmarksCount: 189,
    sharesCount: 12,
    viewCount: 5672,
    readingTime: 8,
    publishedAt: daysAgo(3),
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
    isLiked: false,
    isBookmarked: false,
    content_html: `Design System không chỉ là một bộ component library. Đó là một **ngôn ngữ chung** giữa designers và developers, một "source of truth" cho toàn bộ tổ chức.

## Tại sao chúng tôi quyết định build Design System?

Sau 2 năm phát triển sản phẩm, chúng tôi nhận ra:
- Inconsistent UI across các pages
- Developers tự viết CSS dẫn đến duplication
- Designers phải spec lại cùng một component nhiều lần
- Onboarding new members mất quá nhiều thời gian

## Quy trình 6 tháng

### Tháng 1-2: Audit & Research
- Inventory tất cả components đang dùng (147 components!)
- Phỏng vấn 12 designers + 8 developers
- Research: Material Design, Ant Design, Shopify Polaris, Vercel Design System

### Tháng 3-4: Foundation & Core Components
- Design tokens: colors, spacing, typography, shadows, border-radius
- Core components: Button, Input, Card, Modal, Tooltip, Dropdown
- Storybook documentation với interactive controls
- Automated visual regression testing với Chromatic

### Tháng 5-6: Migration & Adoption
- Codemod scripts để migrate existing codebase
- Office hours hàng tuần để support team
- Migration guide với examples
- Metrics tracking: adoption rate, bundle size, dev velocity

## Kết quả

| Metric | Trước | Sau | Cải thiện |
|--------|-------|-----|-----------|
| Component duplication | 47% | 3% | **93% giảm** |
| Time to build new page | 4h | 1.5h | **62% nhanh hơn** |
| Design handoff issues | 12/sprint | 2/sprint | **83% giảm** |
| Bundle size (components) | 245KB | 187KB | **24% nhẹ hơn** |

## Lessons Learned

1. **Start small** - Đừng cố build tất cả cùng lúc
2. **Design tokens first** - Foundation quyết định mọi thứ sau này
3. **Developer experience** - Nếu DX kém, team sẽ không adopt
4. **Governance** - Ai approve component mới? Ai maintain?
5. **Versioning** - Semantic versioning + breaking change policy

## Kết luận

Design System là một **product**, không phải project. Cần maintain, iterate, và support như một product thật sự.

*Team chúng tôi đang hiring! Nếu bạn quan tâm đến Design Systems, hãy reach out nhé.* 👋`,
    media: [],
  },
  {
    _id: 'post_2',
    title: 'TypeScript Patterns That Will Save Your Sanity',
    slug: 'typescript-patterns-se-sanity',
    content: `TypeScript có thể phức tạp, nhưng những patterns sau đây sẽ giúp code của bạn **type-safe**, **maintainable**, và **developer-friendly**.

## 1. Branded Types cho IDs

\`\`\`typescript
type Brand<T, B> = T & { __brand: B };

type UserId = Brand<string, 'UserId'>;
type PostId = Brand<string, 'PostId'>;

function getUserById(id: UserId) { ... }

// Compile error!
getUserById(postId); // ❌ Argument of type 'PostId' is not assignable to 'UserId'
\`\`\`

## 2. Discriminated Unions cho State Management

\`\`\`typescript
type LoadingState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: User[] }
  | { status: 'error'; error: Error };

function render(state: LoadingState) {
  switch (state.status) {
    case 'idle': return <div>Ready</div>;
    case 'loading': return <Spinner />;
    case 'success': return <UserList users={state.data} />;
    case 'error': return <ErrorMessage error={state.error} />;
  }
}
\`\`\`

## 3. Template Literal Types cho API Endpoints

\`\`\`typescript
type Resource = 'users' | 'posts' | 'comments';
type Action = 'list' | 'get' | 'create' | 'update' | 'delete';

type Endpoint = \`/api/v1/\${Resource}/\${Action}\`;
// "/api/v1/users/list" | "/api/v1/users/get" | ...

function request<T>(endpoint: Endpoint, options?: RequestInit): Promise<T> { ... }
\`\`\`

## 4. Utility Types Mạnh Mẽ

\`\`\`typescript
// Pick chỉ những field cần thiết cho form
type UserFormData = Pick<User, 'name' | 'email' | 'avatar'>;

// Omit field nhạy cảm
type PublicUser = Omit<User, 'password' | 'email' | 'phone'>;

// Required chỉ một số field
type UserWithRequiredEmail = Required<User> & { email: string };

// Deep partial cho nested objects
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
\`\`\`

## 5. Conditional Types cho Flexible APIs

\`\`\`typescript
type ApiResponse<T> = T extends Array<any>
  ? { data: T; pagination: Pagination }
  : { data: T };

// Usage
type UsersResponse = ApiResponse<User[]>;    // { data: User[]; pagination: Pagination }
type UserResponse = ApiResponse<User>;        // { data: User }
\`\`\`

## 6. Mapped Types cho Form Validation

\`\`\`typescript
type FieldErrors<T> = {
  [K in keyof T]?: string;
};

type UserFormErrors = FieldErrors<UserFormData>;
// { name?: string; email?: string; avatar?: string }
\`\`\`

## Bonus: Type-Safe Event Emitter

\`\`\`typescript
type Events = {
  'user:login': { user: User };
  'user:logout': void;
  'post:created': { post: Post };
  'post:updated': { post: Post; changes: Partial<Post> };
};

class TypedEmitter<E extends Record<string, any>> {
  on<K extends keyof E>(event: K, listener: (data: E[K]) => void) { ... }
  emit<K extends keyof E>(event: K, data: E[K]) { ... }
}
\`\`\`

---

**Pro tip:** Bật \`strict: true\` trong tsconfig.json và dùng \`eslint-plugin-typescript\` để catch issues sớm nhất có thể.

Happy typing! 🎯`,
    excerpt: 'TypeScript có thể phức tạp, nhưng những patterns sau đây sẽ giúp code của bạn type-safe, maintainable, và developer-friendly.',
    coverImage: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=1200&q=80',
    cover_image: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=1200&q=80',
    author: mockUsers[1],
    tags: ['typescript', 'patterns', 'best-practices', 'developer-experience'],
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    isSensitive: false,
    is_sensitive: false,
    likeCount: 456,
    likesCount: 456,
    commentCount: 67,
    bookmarkCount: 321,
    bookmarksCount: 321,
    sharesCount: 45,
    viewCount: 12450,
    readingTime: 6,
    publishedAt: daysAgo(7),
    createdAt: daysAgo(8),
    updatedAt: daysAgo(2),
    isLiked: true,
    isBookmarked: false,
    content_html: `TypeScript có thể phức tạp, nhưng những patterns sau đây sẽ giúp code của bạn **type-safe**, **maintainable**, và **developer-friendly**.

## 1. Branded Types cho IDs

\`\`\`typescript
type Brand<T, B> = T & { __brand: B };

type UserId = Brand<string, 'UserId'>;
type PostId = Brand<string, 'PostId'>;

function getUserById(id: UserId) { ... }

// Compile error!
getUserById(postId); // ❌ Argument of type 'PostId' is not assignable to 'UserId'
\`\`\`

## 2. Discriminated Unions cho State Management

\`\`\`typescript
type LoadingState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: User[] }
  | { status: 'error'; error: Error };

function render(state: LoadingState) {
  switch (state.status) {
    case 'idle': return <div>Ready</div>;
    case 'loading': return <Spinner />;
    case 'success': return <UserList users={state.data} />;
    case 'error': return <ErrorMessage error={state.error} />;
  }
}
\`\`\`

## 3. Template Literal Types cho API Endpoints

\`\`\`typescript
type Resource = 'users' | 'posts' | 'comments';
type Action = 'list' | 'get' | 'create' | 'update' | 'delete';

type Endpoint = \`/api/v1/\${Resource}/\${Action}\`;
// "/api/v1/users/list" | "/api/v1/users/get" | ...

function request<T>(endpoint: Endpoint, options?: RequestInit): Promise<T> { ... }
\`\`\`

## 4. Utility Types Mạnh Mẽ

\`\`\`typescript
// Pick chỉ những field cần thiết cho form
type UserFormData = Pick<User, 'name' | 'email' | 'avatar'>;

// Omit field nhạy cảm
type PublicUser = Omit<User, 'password' | 'email' | 'phone'>;

// Required chỉ một số field
type UserWithRequiredEmail = Required<User> & { email: string };

// Deep partial cho nested objects
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
\`\`\`

## 5. Conditional Types cho Flexible APIs

\`\`\`typescript
type ApiResponse<T> = T extends Array<any>
  ? { data: T; pagination: Pagination }
  : { data: T };

// Usage
type UsersResponse = ApiResponse<User[]>;    // { data: User[]; pagination: Pagination }
type UserResponse = ApiResponse<User>;        // { data: User }
\`\`\`

## 6. Mapped Types cho Form Validation

\`\`\`typescript
type FieldErrors<T> = {
  [K in keyof T]?: string;
};

type UserFormErrors = FieldErrors<UserFormData>;
// { name?: string; email?: string; avatar?: string }
\`\`\`

## Bonus: Type-Safe Event Emitter

\`\`\`typescript
type Events = {
  'user:login': { user: User };
  'user:logout': void;
  'post:created': { post: Post };
  'post:updated': { post: Post; changes: Partial<Post> };
};

class TypedEmitter<E extends Record<string, any>> {
  on<K extends keyof E>(event: K, listener: (data: E[K]) => void) { ... }
  emit<K extends keyof E>(event: K, data: E[K]) { ... }
}
\`\`\`

---

**Pro tip:** Bật \`strict: true\` trong tsconfig.json và dùng \`eslint-plugin-typescript\` để catch issues sớm nhất có thể.

Happy typing! 🎯`,
    media: [],
  },
  {
    _id: 'post_3',
    title: 'Tại sao tôi chuyển từ REST sang GraphQL (và những điều tôi ước biết sớm hơn)',
    slug: 'tai-sao-toi-chuyen-tu-rest-sang-graphql',
    content: `Sau 3 năm xây dựng REST APIs, tôi quyết định migrate sang GraphQL. Đây là hành trình và những bài học.

## Vấn đề với REST

### Over-fetching
\`\`\`bash
GET /api/users/123
# Trả về: id, name, email, phone, address, createdAt, updatedAt, lastLoginAt, preferences, ...
# Client chỉ cần: name, email
\`\`\`

### Under-fetching (N+1 problem)
\`\`\`bash
GET /api/posts/456
GET /api/users/123          # author
GET /api/users/123/posts    # author's other posts
GET /api/posts/456/comments # comments
GET /api/users/789          # commenter 1
GET /api/users/456          # commenter 2
# ... N requests cho một trang
\`\`\`

### Versioning Hell
\`\`\`bash
/api/v1/users
/api/v2/users
/api/v3/users
# Breaking changes = new version = maintenance burden
\`\`\`

## GraphQL Giải Quyết Như Thế Nào?

### Single Request, Exact Data
\`\`\`graphql
query GetPostWithDetails($id: ID!) {
  post(id: $id) {
    title
    content
    author {
      name
      avatar
      bio
    }
    comments(first: 10) {
      edges {
        node {
          content
          author { name avatar }
        }
      }
    }
    tags
    readingTime
  }
}
\`\`\`

### Schema = Documentation = Contract
\`\`\`graphql
type User {
  id: ID!
  name: String!
  email: String!
  avatar: String
  posts(first: Int, after: String): PostConnection!
  followers: UserConnection!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
  tags: [String!]!
  publishedAt: DateTime!
}
\`\`\`

### Deprecation Instead of Versioning
\`\`\`graphql
type User {
  email: String! @deprecated(reason: "Use contactEmail instead")
  contactEmail: String!
  phone: String @deprecated(reason: "No longer supported")
}
\`\`\`

## Những Gì Tôi Ước Biết Sớm Hơn

### 1. N+1 Problem Vẫn Tồn Tại (DataLoader là bắt buộc)
\`\`\`javascript
// ❌ Không dùng DataLoader = N+1 queries
const author = await db.users.findById(post.authorId);

// ✅ DataLoader batching
const author = await userLoader.load(post.authorId);
\`\`\`

### 2. Caching Phức Tạp Hơn
\`\`\`javascript
// Apollo Client cache config
typePolicies: {
  Query: {
    fields: {
      posts: offsetLimitPagination(),
      user: keyArgs(['id']),
    },
  },
}
\`\`\`

### 3. Query Complexity Analysis Cần Thiết
\`\`\`javascript
// Prevent expensive queries
const complexityRule = (query) => {
  const complexity = calculateComplexity(query);
  if (complexity > 1000) throw new Error('Query too complex');
};
\`\`\`

### 4. File Uploads = Đau Đầu
\`\`\`graphql
# GraphQL spec không có file upload
# Cần dùng multipart request (graphql-upload)
mutation UploadAvatar($file: Upload!) {
  uploadAvatar(file: $file) { url }
}
\`\`\`

### 5. Real-time Subscriptions Cần Infrastructure
\`\`\`graphql
subscription OnPostCreated($authorId: ID!) {
  postCreated(authorId: $authorId) {
    id
    title
    publishedAt
  }
}
\`\`\`
Cần Redis + WebSocket server (như GraphQL Yoga, Apollo Server).

## Khi Nào NÊN Dùng GraphQL?

✅ Multiple clients (web, mobile, third-party) với data needs khác nhau
✅ Complex relationships giữa entities
✅ Rapidly evolving frontend requirements
✅ Microservices aggregation (BFF pattern)
✅ Real-time features quan trọng

## Khi Nào KHÔNG NÊN Dùng GraphQL?

❌ Simple CRUD app với ít relationships
❌ Team chưa có kinh nghiệm GraphQL
❌ Caching requirements đơn giản (REST + HTTP caching đủ)
❌ Internal APIs chỉ serve 1 client
❌ Performance-critical paths (REST đơn giản hơn để optimize)

## Kết Luận

GraphQL không phải silver bullet. Nó **shift complexity** từ client sang server. Nếu team bạn sẵn sàng invest vào:
- Schema design & governance
- DataLoader implementation
- Caching strategy
- Query complexity analysis
- Monitoring & observability

Thì GraphQL sẽ mang lại DX tuyệt vời và flexibility cho frontend team.

*Còn bạn? Đã thử GraphQL chưa? Share experience của bạn ở comments nhé!* 👇`,
    excerpt: 'Sau 3 năm xây dựng REST APIs, tôi quyết định migrate sang GraphQL. Đây là hành trình và những bài học.',
    coverImage: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=1200&q=80',
    author: mockUsers[2],
    tags: ['graphql', 'rest', 'api-design', 'architecture', 'migration'],
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    isSensitive: false,
    likeCount: 312,
    commentCount: 89,
    bookmarkCount: 267,
    viewCount: 8934,
    readingTime: 10,
    publishedAt: daysAgo(12),
    createdAt: daysAgo(14),
    updatedAt: daysAgo(5),
    isLiked: false,
    isBookmarked: true,
  },
  {
    _id: 'post_4',
    title: 'React Server Components: Mental Model & Practical Patterns',
    slug: 'react-server-components-mental-model',
    content: `React Server Components (RSC) thay đổi hoàn toàn cách chúng ta nghĩ về React. Bài viết này giải thích mental model và patterns thực tế.

## Mental Model: Server vs Client Components

### Server Components (Default)
\`\`\`tsx
// app/posts/[id]/page.tsx - Server Component by default
import { getPost } from '@/lib/posts';
import { PostContent } from '@/components/PostContent';

export default async function PostPage({ params }: { params: { id: string } }) {
  // Runs on SERVER, can access DB directly
  const post = await getPost(params.id);

  // Returns HTML streamed to client
  return <PostContent post={post} />;
}
\`\`\`

**Đặc điểm:**
- ❌ Không dùng state, effects, browser APIs
- ❌ Không có event handlers (onClick, onChange)
- ✅ Async/await trực tiếp
- ✅ Truy cập DB, filesystem, secrets
- ✅ Zero bundle size (không gửi JS đến client)

### Client Components ('use client')
\`\`\`tsx
// components/LikeButton.tsx
'use client';

import { useState } from 'react';
import { useLike } from '@/hooks/useLike';

export function LikeButton({ postId, initialLikes }: LikeButtonProps) {
  const [likes, setLikes] = useState(initialLikes);
  const { mutate: like } = useLike();

  return (
    <button onClick={() => {
      setLikes(l => l + 1);
      like({ postId });
    }}>
      ❤️ {likes}
    </button>
  );
}
\`\`\`

**Đặc điểm:**
- ✅ useState, useEffect, useContext
- ✅ Event handlers, browser APIs
- ✅ Interactivity
- ❌ Bundle size > 0
- ❌ Không thể async/await data fetching trực tiếp

## Composition Pattern: Server Wraps Client

\`\`\`tsx
// app/posts/[id]/page.tsx (Server Component)
import { Suspense } from 'react';
import { getPost } from '@/lib/posts';
import { PostHeader } from '@/components/PostHeader';
import { PostContent } from '@/components/PostContent';
import { CommentsSection } from '@/components/CommentsSection';

export default async function PostPage({ params }) {
  const post = await getPost(params.id);

  return (
    <article>
      <PostHeader post={post} />
      <PostContent content={post.content} />

      {/* Client component wrapped in Suspense */}
      <Suspense fallback={<CommentsSkeleton />}>
        <CommentsSection postId={post.id} />
      </Suspense>
    </article>
  );
}
\`\`\`

\`\`\`tsx
// components/CommentsSection.tsx (Client Component)
'use client';

import { useState } from 'react';
import { CommentList } from './CommentList';
import { CommentForm } from './CommentForm';

export function CommentsSection({ postId }: { postId: string }) {
  return (
    <section>
      <CommentList postId={postId} />
      <CommentForm postId={postId} />
    </section>
  );
}
\`\`\`

## Data Fetching Patterns

### 1. Parallel Data Fetching (Recommended)
\`\`\`tsx
// ✅ GOOD: Parallel
async function getPageData(id: string) {
  const [post, author, comments, related] = await Promise.all([
    getPost(id),
    getAuthor(post.authorId),
    getComments(id),
    getRelatedPosts(id),
  ]);
  return { post, author, comments, related };
}
\`\`\`

### 2. Sequential (When Dependencies Exist)
\`\`\`tsx
// ✅ OK: Dependent fetches
async function getPageData(id: string) {
  const post = await getPost(id);           // Need post first
  const author = await getAuthor(post.authorId);  // Depends on post
  const comments = await getComments(id);   // Independent, can be parallel
  return { post, author, comments };
}
\`\`\`

### 3. Streaming with Suspense
\`\`\`tsx
// app/page.tsx
import { Suspense } from 'react';
import { PostList } from '@/components/PostList';
import { Sidebar } from '@/components/Sidebar';

export default function HomePage() {
  return (
    <div className="grid gap-8">
      {/* Stream immediately */}
      <Suspense fallback={<PostListSkeleton />}>
        <PostList />
      </Suspense>

      {/* Stream when ready */}
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>
    </div>
  );
}
\`\`\`

## Practical Patterns

### Pattern 1: Client Island trong Server Sea
\`\`\`tsx
// Server Component
export default function Dashboard() {
  return (
    <div className="grid gap-6">
      <ServerStats />           {/* Server */}
      <Suspense fallback={<ChartSkeleton />}>
        <InteractiveChart />    {/* Client - "island" */}
      </Suspense>
      <ServerRecentActivity />  {/* Server */}
    </div>
  );
}
\`\`\`

### Pattern 2: Passing Server Data to Client Components
\`\`\`tsx
// Server Component
import { InteractiveTable } from '@/components/InteractiveTable';

export default async function UsersPage() {
  const users = await getUsers(); // Server-side fetch

  // Pass serialized data to client component
  return <InteractiveTable initialData={users} />;
}
\`\`\`

\`\`\`tsx
// Client Component
'use client';

import { useState } from 'react';

export function InteractiveTable({ initialData }: { initialData: User[] }) {
  const [data, setData] = useState(initialData);
  const [sort, setSort] = useState<SortConfig>({ key: 'name', direction: 'asc' });

  // Client-side sorting, filtering, pagination
  return <Table data={data} sort={sort} onSort={setSort} />;
}
\`\`\`

### Pattern 3: Server Actions cho Mutations
\`\`\`tsx
// actions.ts (Server-side)
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  const post = await db.post.create({ title, content });

  revalidatePath('/posts');
  return post;
}
\`\`\`

\`\`\`tsx
// Client Component
'use client';

import { createPost } from '@/actions';

export function CreatePostForm() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <textarea name="content" required />
      <button type="submit">Publish</button>
    </form>
  );
}
\`\`\`

## Common Pitfalls & Solutions

### ❌ Pitfall: "use client" ở Root Layout
\`\`\`tsx
// app/layout.tsx - KHÔNG LÀM NHƯ THẾ NÀY
'use client'; // ❌ Tất cả children trở thành client components!

export default function RootLayout({ children }) {
  return <html>{children}</html>;
}
\`\`\`

✅ **Solution:** Chỉ dùng 'use client' ở leaf components cần interactivity.

### ❌ Pitfall: Passing Functions as Props to Client Components
\`\`\`tsx
// Server Component
export default function Page() {
  const handleClick = () => console.log('clicked'); // ❌ Function không serializable
  return <ClientButton onClick={handleClick} />;
}
\`\`\`

✅ **Solution:** Dùng Server Actions hoặc pass data, không pass functions.

### ❌ Pitfall: Using Browser APIs in Server Components
\`\`\`tsx
// ❌ SERVER COMPONENT
export default function Page() {
  const width = window.innerWidth; // ❌ window không tồn tại trên server
  return <div>{width}</div>;
}
\`\`\`

✅ **Solution:** Move to Client Component hoặc dùng CSS media queries.

## Migration Checklist

- [ ] Audit current components: Which need interactivity?
- [ ] Move data fetching to Server Components
- [ ] Extract interactive parts to Client Components
- [ ] Add 'use client' directive only where needed
- [ ] Test streaming with Suspense boundaries
- [ ] Verify bundle size reduction
- [ ] Check SEO metadata still works
- [ ] Test Server Actions for forms

## Kết Luận

RSC không phải "cách mới để viết React" - nó là **mental model mới**:
- **Server Components** = Data fetching + Rendering (HTML)
- **Client Components** = Interactivity (JS)
- **Composition** = Best of both worlds

Start small: Convert một page, đo bundle size, measure performance. RSC shines khi bạn embrace streaming và progressive enhancement.

*Questions? Drop a comment!* 👇`,
    excerpt: 'React Server Components (RSC) thay đổi hoàn toàn cách chúng ta nghĩ về React. Bài viết này giải thích mental model và patterns thực tế.',
    coverImage: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&q=80',
    author: mockUsers[3],
    tags: ['react', 'rsc', 'nextjs', 'server-components', 'architecture'],
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    isSensitive: false,
    likeCount: 567,
    commentCount: 123,
    bookmarkCount: 445,
    viewCount: 15678,
    readingTime: 12,
    publishedAt: daysAgo(1),
    createdAt: daysAgo(2),
    updatedAt: hoursAgo(6),
    isLiked: true,
    isBookmarked: true,
  },
  {
    _id: 'post_5',
    title: 'Building Accessible Components: A Practical Guide',
    slug: 'building-accessible-components-practical-guide',
    content: `Accessibility (a11y) không phải feature - nó là **requirement**. Hướng dẫn thực tế để build components accessible từ đầu.

## Tại sao Accessibility Quan Trọng?

- **15% dân số** có hình thức khuyết tật nào đó (WHO)
- **Legal requirement**: ADA, WCAG, European Accessibility Act
- **Better UX cho tất cả**: Keyboard nav, screen readers, high contrast
- **SEO benefits**: Semantic HTML = better crawling

## Core Principles: POUR

| Principle | Mô tả | Ví dụ |
|-----------|-------|-------|
| **Perceivable** | Thông tin phải có thể nhận biết | Alt text, captions, contrast |
| **Operable** | UI có thể điều khiển được | Keyboard nav, focus management |
| **Understandable** | Nội dung dễ hiểu | Clear language, consistent nav |
| **Robust** | Tương thích với AT (Assistive Tech) | Valid HTML, ARIA attributes |

## Practical Patterns

### 1. Semantic HTML First
\`\`\`tsx
// ❌ BAD: Div soup
<div className="button" onClick={handleClick}>Click me</div>

// ✅ GOOD: Semantic button
<button className="button" onClick={handleClick}>Click me</button>

// ✅ GOOD: Link for navigation
<a href="/about" className="link">About Us</a>
\`\`\`

### 2. Focus Management
\`\`\`tsx
// Focus visible styles (Tailwind)
<button className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" />

// Skip to main content
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-4 py-2 bg-blue-600 text-white rounded">
  Skip to main content
</a>

<main id="main-content">...</main>
\`\`\`

### 3. ARIA - Chỉ Khi Cần Thiết
\`\`\`tsx
// ❌ BAD: ARIA redundant với semantic HTML
<button role="button" aria-label="Close">×</button>

// ✅ GOOD: Native element đã có semantic
<button aria-label="Close dialog">×</button>

// ✅ GOOD: Custom component cần ARIA
<div role="tablist" aria-label="Settings panels">
  <button role="tab" aria-selected="true" aria-controls="panel-1" id="tab-1">Profile</button>
  <button role="tab" aria-selected="false" aria-controls="panel-2" id="tab-2">Notifications</button>
</div>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">...</div>
<div role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>...</div>
\`\`\`

### 4. Color Contrast
\`\`\`css
/* WCAG AA: 4.5:1 normal text, 3:1 large text */
/* WCAG AAA: 7:1 normal text, 4.5:1 large text */

.text-primary {
  color: #1a1a2e;  /* 12.6:1 on white - AAA ✅ */
}

.text-muted {
  color: #6b7280;  /* 4.5:1 on white - AA ✅ */
}

/* ❌ FAIL: color: #9ca3af; (gray-400) = 2.9:1 */
\`\`\`

### 5. Form Accessibility
\`\`\`tsx
<form>
  <div className="space-y-4">
    <div>
      <label htmlFor="email" className="block text-sm font-medium mb-1">
        Email Address
      </label>
      <input
        type="email"
        id="email"
        name="email"
        required
        aria-describedby="email-hint"
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span id="email-hint" className="text-sm text-gray-500">
        We'll never share your email
      </span>
    </div>

    <div>
      <fieldset>
        <legend className="block text-sm font-medium mb-2">Notification Preferences</legend>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="email-notif" />
            <span>Email notifications</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="push-notif" />
            <span>Push notifications</span>
          </label>
        </div>
      </fieldset>
    </div>
  </div>
</form>
\`\`\`

### 6. Modal/Dialog Accessibility
\`\`\`tsx
'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      overlayRef.current?.focus();

      // Trap focus
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'Tab') trapFocus(e);
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
      previousActiveElement.current?.focus();
    }
  }, [isOpen, onClose]);

  const trapFocus = (e: KeyboardEvent) => {
    const focusableElements = overlayRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusableElements?.length) return;

    const first = focusableElements[0] as HTMLElement;
    const last = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabIndex={-1}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 id="modal-title" className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
\`\`\`

## Testing Checklist

### Automated (CI)
- [ ] **axe-core** / **jest-axe** unit tests
- [ ] **Lighthouse CI** accessibility score > 90
- [ ] **ESLint jsx-a11y** plugin

### Manual (Mỗi PR)
- [ ] **Tab navigation** - có thể duyệt toàn bộ UI chỉ bằng keyboard
- [ ] **Focus visible** - rõ ràng đang focus element nào
- [ ] **Screen reader** - test với NVDA (Windows) / VoiceOver (Mac)
- [ ] **Zoom 200%** - nội dung không bị cắt, overlap
- [ ] **High contrast mode** - Windows High Contrast / macOS Increase Contrast
- [ ] **Color blind simulation** - dùng Chrome DevTools rendering tab

## Tools & Resources

| Tool | Mục đích |
|------|----------|
| **axe DevTools** | Browser extension audit |
| **WAVE** | Web accessibility evaluation |
| **Color Contrast Analyzer** | Kiểm tra contrast ratio |
| **Storybook a11y addon** | Component-level testing |
| **eslint-plugin-jsx-a11y** | Lint-time warnings |

## Kết Luận

Accessibility không phải "thêm vào sau" - nó là **cách bạn build từ đầu**. Semantic HTML + proper focus management + thoughtful ARIA = 80% việc done.

Start hôm nay: Chạy \`npm i -D @axe-core/react\` và thêm vào test suite. Small investment, huge impact.

*Accessible web là better web cho mọi người.* ♿💙`,
    excerpt: 'Accessibility (a11y) không phải feature - nó là requirement. Hướng dẫn thực tế để build components accessible từ đầu.',
    coverImage: 'https://images.unsplash.com/photo-1587560699334-cc4ff634909a?w=1200&q=80',
    author: mockUsers[4],
    tags: ['accessibility', 'a11y', 'react', 'web-standards', 'inclusive-design'],
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    isSensitive: false,
    likeCount: 189,
    commentCount: 34,
    bookmarkCount: 156,
    viewCount: 4321,
    readingTime: 9,
    publishedAt: daysAgo(18),
    createdAt: daysAgo(20),
    updatedAt: daysAgo(10),
    isLiked: false,
    isBookmarked: false,
  },
];

// Mock Comments
export const mockComments = [
  {
    _id: 'comment_1',
    content: 'Bài viết rất hay! Phần về design tokens đặc biệt hữu ích cho team mình đang xây dựng design system. Cảm ơn bạn đã chia sẻ chi tiết như vậy.',
    author: mockUsers[1],
    postId: 'post_1',
    parentId: null,
    likeCount: 12,
    isLiked: false,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
    replies: [
      {
        _id: 'comment_2',
        content: 'Cảm ơn bạn! Nếu cần tư vấn thêm về migration strategy thì ping mình nhé 😊',
        author: mockUsers[0],
        postId: 'post_1',
        parentId: 'comment_1',
        likeCount: 3,
        isLiked: true,
        createdAt: daysAgo(1),
        updatedAt: daysAgo(1),
        replies: [],
      },
    ],
  },
  {
    _id: 'comment_3',
    content: 'TypeScript branded types là game changer! Mình đã áp dụng cho project hiện tại và giảm được 90% bug liên quan đến ID confusion.',
    author: mockUsers[2],
    postId: 'post_2',
    parentId: null,
    likeCount: 45,
    isLiked: true,
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
    replies: [],
  },
  {
    _id: 'comment_4',
    content: 'GraphQL migration story rất thực tế. Phần về DataLoader và caching là những pain point thực sự. Thanks for sharing!',
    author: mockUsers[3],
    postId: 'post_3',
    parentId: null,
    likeCount: 23,
    isLiked: false,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
    replies: [
      {
        _id: 'comment_5',
        content: 'Caching với Apollo Client thực sự phức tạp. Mình recommend đọc docs về cache policies kỹ trước khi migrate.',
        author: mockUsers[4],
        postId: 'post_3',
        parentId: 'comment_4',
        likeCount: 8,
        isLiked: false,
        createdAt: daysAgo(9),
        updatedAt: daysAgo(9),
        replies: [],
      },
    ],
  },
];

// Mock Notifications
export const mockNotifications = [
  {
    _id: 'notif_1',
    type: 'LIKE',
    title: 'Trần Thị B đã thích bài viết của bạn',
    message: 'Trần Thị B đã thích bài viết "Xây dựng Design System từ con số 0"',
    postId: 'post_1',
    postSlug: 'xay-dung-design-system-tu-con-so-0',
    actor: mockUsers[1],
    isRead: false,
    createdAt: hoursAgo(2),
  },
  {
    _id: 'notif_2',
    type: 'COMMENT',
    title: 'Lê Văn C đã bình luận trên bài viết của bạn',
    message: 'Lê Văn C: "TypeScript branded types là game changer! Mình đã áp dụng..."',
    postId: 'post_2',
    postSlug: 'typescript-patterns-se-sanity',
    actor: mockUsers[2],
    isRead: false,
    createdAt: hoursAgo(5),
  },
  {
    _id: 'notif_3',
    type: 'FOLLOW',
    title: 'Phạm Thị D đã theo dõi bạn',
    message: 'Phạm Thị D đã bắt đầu theo dõi bạn',
    actor: mockUsers[3],
    isRead: true,
    createdAt: daysAgo(1),
  },
  {
    _id: 'notif_4',
    type: 'REPOST',
    title: 'Hoàng Văn E đã repost bài viết của bạn',
    message: 'Hoàng Văn E đã chia sẻ bài viết "React Server Components: Mental Model & Practical Patterns"',
    postId: 'post_4',
    postSlug: 'react-server-components-mental-model',
    actor: mockUsers[4],
    isRead: true,
    createdAt: daysAgo(3),
  },
  {
    _id: 'notif_5',
    type: 'MENTION',
    title: 'Bạn được nhắc đến trong bình luận',
    message: 'Trần Thị B đã nhắc đến bạn trong bình luận trên bài "Tại sao tôi chuyển từ REST sang GraphQL"',
    postId: 'post_3',
    postSlug: 'tai-sao-toi-chuyen-tu-rest-sang-graphql',
    actor: mockUsers[1],
    isRead: false,
    createdAt: hoursAgo(12),
  },
];

// Mock Admin Data
export const mockAdminUsers = [
  { ...mockUsers[0], emailVerified: true, lastLoginAt: hoursAgo(1) },
  { ...mockUsers[1], emailVerified: true, lastLoginAt: hoursAgo(3) },
  { ...mockUsers[2], emailVerified: true, lastLoginAt: hoursAgo(12) },
  { ...mockUsers[3], emailVerified: false, lastLoginAt: daysAgo(2) },
  { ...mockUsers[4], emailVerified: true, lastLoginAt: hoursAgo(6) },
  {
    _id: 'user_6',
    username: 'spam_user_1',
    email: 'spam1@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=spam_user_1',
    bio: '',
    role: 'USER',
    violationScore: 5,
    isMuted: true,
    isBanned: false,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(1),
    followersCount: 2,
    followingCount: 0,
    postsCount: 15,
    emailVerified: false,
    lastLoginAt: hoursAgo(4),
  },
  {
    _id: 'user_7',
    username: 'banned_user',
    email: 'banned@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=banned_user',
    bio: 'This account has been banned',
    role: 'USER',
    violationScore: 10,
    isMuted: true,
    isBanned: true,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(5),
    followersCount: 0,
    followingCount: 0,
    postsCount: 8,
    emailVerified: false,
    lastLoginAt: daysAgo(5),
  },
];

export const mockViolations = [
  { _id: 'viol_1', userId: 'user_6', username: 'spam_user_1', type: 'SPAM', count: 3, lastAt: daysAgo(2) },
  { _id: 'viol_2', userId: 'user_6', username: 'spam_user_1', type: 'TOXIC', count: 2, lastAt: daysAgo(5) },
  { _id: 'viol_3', userId: 'user_7', username: 'banned_user', type: 'TOXIC', count: 5, lastAt: daysAgo(10) },
  { _id: 'viol_4', userId: 'user_7', username: 'banned_user', type: 'SPAM', count: 3, lastAt: daysAgo(15) },
  { _id: 'viol_5', userId: 'user_4', username: 'pham_thi_d', type: 'SPAM', count: 1, lastAt: daysAgo(20) },
];

export const mockReports = [
  {
    _id: 'report_1',
    reporterId: 'user_2',
    reporterUsername: 'tran_thi_b',
    targetType: 'POST',
    targetId: 'post_3',
    targetTitle: 'Tại sao tôi chuyển từ REST sang GraphQL',
    reason: 'Nội dung chứa thông tin sai lệch về hiệu năng GraphQL',
    status: 'PENDING',
    createdAt: daysAgo(1),
  },
  {
    _id: 'report_2',
    reporterId: 'user_4',
    reporterUsername: 'pham_thi_d',
    targetType: 'COMMENT',
    targetId: 'comment_3',
    targetTitle: 'Bình luận trên bài TypeScript Patterns',
    reason: 'Ngôn ngữ thô tục, tấn công cá nhân',
    status: 'RESOLVED',
    resolvedBy: 'le_van_c',
    resolvedAction: 'HIDE',
    createdAt: daysAgo(3),
    resolvedAt: daysAgo(2),
  },
];

// Mock Appeals
export const mockAppeals = [
  {
    _id: 'appeal_1',
    userId: 'user_6',
    username: 'spam_user_1',
    contentId: 'post_6',
    contentType: 'POST',
    reason: 'Bài viết của mình không phải spam, là chia sẻ kinh nghiệm thực tế',
    status: 'PENDING',
    createdAt: daysAgo(2),
  },
  {
    _id: 'appeal_2',
    userId: 'user_7',
    username: 'banned_user',
    contentId: 'comment_6',
    contentType: 'COMMENT',
    reason: 'Mình chỉ phản biện, không có ý xúc phạm',
    status: 'REJECTED',
    reviewedBy: 'le_van_c',
    reviewNote: 'Nội dung vi phạm chính sách cộng đồng',
    createdAt: daysAgo(5),
    reviewedAt: daysAgo(3),
  },
];

// Mock Messages/Conversations
export const mockConversations = [
  {
    _id: 'conv_1',
    participants: [mockUsers[0], mockUsers[1]],
    lastMessage: {
      _id: 'msg_1',
      content: 'Hey, xem bài viết mới của mình nhé!',
      senderId: 'user_1',
      createdAt: hoursAgo(1),
    },
    unreadCount: 2,
    updatedAt: hoursAgo(1),
  },
  {
    _id: 'conv_2',
    participants: [mockUsers[0], mockUsers[2]],
    lastMessage: {
      _id: 'msg_2',
      content: 'Cảm ơn feedback về PR #234',
      senderId: 'user_3',
      createdAt: hoursAgo(4),
    },
    unreadCount: 0,
    updatedAt: hoursAgo(4),
  },
  {
    _id: 'conv_3',
    participants: [mockUsers[0], mockUsers[3]],
    lastMessage: {
      _id: 'msg_3',
      content: 'Team meeting lúc 2pm nhé',
      senderId: 'user_4',
      createdAt: daysAgo(1),
    },
    unreadCount: 1,
    updatedAt: daysAgo(1),
  },
];

// Helper functions
export const getMockPostBySlug = (slug) => mockPosts.find(p => p.slug === slug);
export const getMockPostById = (id) => mockPosts.find(p => p._id === id);
export const getMockUserById = (id) => mockUsers.find(u => u._id === id);
export const getMockCommentsByPostId = (postId) => mockComments.filter(c => c.postId === postId && !c.parentId);
export const getMockNotifications = () => mockNotifications;
export const getMockAdminUsers = () => mockAdminUsers;
export const getMockViolations = () => mockViolations;
export const getMockReports = () => mockReports;
export const getMockAppeals = () => mockAppeals;
export const getMockConversations = () => mockConversations;