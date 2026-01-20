export default function BlogSection() {
  return (
    <section className="min-h-screen flex flex-col px-8 md:px-16 lg:px-24 pt-4 pb-16 md:pt-6 md:pb-24 bg-[#FAF9F6] relative z-10">
      <h2 className="font-[family-name:var(--font-body)] font-bold text-4xl md:text-5xl lg:text-6xl mb-12">
        Here&apos;s what I&apos;ve been up to...
      </h2>

      <div className="max-w-4xl space-y-8">
        {/* Placeholder blog posts */}
        <article className="border-b border-[#2C2C2C]/10 pb-8">
          <time className="text-sm opacity-50 mb-2 block">Coming soon</time>
          <h3 className="font-[family-name:var(--font-body)] font-bold text-xl md:text-2xl mb-3">
            Blog post title
          </h3>
          <p className="text-lg leading-relaxed opacity-70">
            Content coming soon. This section will feature updates, thoughts, and projects in a Substack-style format.
          </p>
        </article>

        <article className="border-b border-[#2C2C2C]/10 pb-8">
          <time className="text-sm opacity-50 mb-2 block">Coming soon</time>
          <h3 className="font-[family-name:var(--font-body)] font-bold text-xl md:text-2xl mb-3">
            Another update
          </h3>
          <p className="text-lg leading-relaxed opacity-70">
            More content placeholder for the blog section.
          </p>
        </article>
      </div>
    </section>
  );
}
