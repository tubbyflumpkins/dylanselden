import LenisProvider from '@/components/LenisProvider';
import BlogSection from '@/components/BlogSection';

export default function Home() {
  return (
    <LenisProvider>
      <main className="relative">
        {/* First viewport - transparent so hero image shows through */}
        <div className="h-screen relative z-0" />

        {/* Blog section - has background to cover hero as you scroll */}
        <BlogSection />
      </main>
    </LenisProvider>
  );
}
