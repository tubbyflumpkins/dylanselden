import LenisProvider from '@/components/LenisProvider';
import BlogSection from '@/components/BlogSection';
import IntroSection from '@/components/IntroSection';

export default function Home2() {
  return (
    <LenisProvider>
      <main className="relative">
        {/* First viewport - transparent so hero image shows through */}
        <div className="h-screen relative z-0" />

        {/* Intro section */}
        <IntroSection />

        {/* Blog section - has background to cover hero as you scroll */}
        <BlogSection />
      </main>
    </LenisProvider>
  );
}
