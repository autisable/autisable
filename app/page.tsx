import Hero from "./components/home/Hero";
import FeaturedStory from "./components/home/FeaturedStory";
import ContentPillars from "./components/home/ContentPillars";
import LatestPosts from "./components/home/LatestPosts";
import PodcastSection from "./components/home/PodcastSection";
import CommunityPreview from "./components/home/CommunityPreview";
import ResourcesSection from "./components/home/ResourcesSection";
import NewsletterSection from "./components/home/NewsletterSection";

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedStory />
      <ContentPillars />
      <NewsletterSection />
      <LatestPosts />
      <PodcastSection />
      <CommunityPreview />
      <ResourcesSection />
    </>
  );
}
