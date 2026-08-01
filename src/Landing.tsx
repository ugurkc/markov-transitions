import { ThemeToggle } from './components/ThemeToggle'
import { useTheme } from './state/useTheme'

interface Post {
  slug: string
  title: string
  eyebrow: string
  description: string
  date: string
}

/**
 * The directory. New posts go at the front of this array — the landing page
 * renders it in order, so the newest piece is always what a visitor sees
 * first.
 */
const POSTS: Post[] = [
  {
    slug: 'watershed',
    title: 'Watershed',
    eyebrow: 'Player lifecycles as Markov chains',
    description:
      'An interactive essay and tool for modeling how players move through a game — build a chain of states and transitions, then simulate a cohort and watch a live retention curve. You can’t move the destination directly; you can only reshape the path that leads there.',
    date: '2026-08-01',
  },
]

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default function Landing() {
  const [theme, setTheme] = useTheme()
  return (
    <div className="landing-page">
      <ThemeToggle
        theme={theme}
        onToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />
      <main className="landing">
        <header className="landing-header">
          <h1>Ugur Koc</h1>
          <p className="placeholder">
            A line or two about who you are and what this collection of
            writing is for &mdash; replace this before it goes anywhere
            public.
          </p>
        </header>

        <section aria-labelledby="writing-heading">
          <p className="eyebrow" id="writing-heading">Writing</p>
          <ul className="post-list">
            {POSTS.map((post) => (
              <li key={post.slug} className="post-card">
                <a href={`${import.meta.env.BASE_URL}essays/${post.slug}/`}>
                  <span className="post-eyebrow">{post.eyebrow}</span>
                  <h2>{post.title}</h2>
                  <p className="post-description">{post.description}</p>
                  <span className="post-date">{formatDate(post.date)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <footer className="landing-footer">
          <a href="https://github.com/ugurkc">GitHub</a>
        </footer>
      </main>
    </div>
  )
}
