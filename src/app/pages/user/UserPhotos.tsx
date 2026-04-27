import { useMemo } from 'react';
import { Image, Sparkles } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/Button';
import { useNavigate } from 'react-router';
import { useLandingPage } from '../../context/LandingPageContext';

export const UserPhotos = () => {
  const navigate = useNavigate();
  const { content } = useLandingPage();

  const photos = useMemo(
    () => (Array.isArray(content.gallery) ? content.gallery.filter((photo) => photo.url) : []),
    [content.gallery]
  );

  const featuredPhoto = photos[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 mb-3">
              <Sparkles className="w-4 h-4" />
              Photos
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Court Photos</h1>
          </div>

          <Button variant="outline" onClick={() => navigate('/user/home')}>
            Back to Home
          </Button>
        </div>

        {featuredPhoto ? (
          <GlassCard className="overflow-hidden mb-6">
            <div className="grid lg:grid-cols-[1.4fr_1fr] min-h-[320px]">
              <div className="bg-gray-100">
                <img
                  src={featuredPhoto.url}
                  alt={featuredPhoto.caption || 'Featured court photo'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6 lg:p-8 flex flex-col justify-between gap-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 mb-3">Featured Photo</p>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">{featuredPhoto.caption || 'Court Photo'}</h2>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <Image className="w-4 h-4" />
                  {photos.length} {photos.length === 1 ? 'photo' : 'photos'} available
                </div>
              </div>
            </div>
          </GlassCard>
        ) : null}

        {photos.length === 0 ? (
          <GlassCard className="p-8 text-center text-gray-600">
            No photos have been uploaded yet.
          </GlassCard>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {photos.map((photo) => (
              <GlassCard key={photo.id} className="overflow-hidden">
                <div className="aspect-[4/3] bg-gray-100">
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Court photo'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <p className="font-medium text-gray-900">{photo.caption || 'Untitled photo'}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};