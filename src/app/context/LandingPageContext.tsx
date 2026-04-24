import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getCurrentUserToken } from '../lib/firebaseClient';
import { showErrorToast } from '../utils/notificationHelpers';

export interface LandingPageContent {
  // Hero Section
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  heroCTA: string;
  heroSecondaryButton: string;
  heroImage: string;

  // Features Section
  features: {
    id: string;
    icon: string;
    title: string;
    description: string;
  }[];

  // Stats Section
  stats: {
    id: string;
    value: string;
    label: string;
  }[];

  // About Section
  aboutTitle: string;
  aboutDescription: string;
  aboutImage: string;

  // Gallery Section
  galleryTitle: string;
  gallerySubtitle: string;
  gallery: {
    id: string;
    url: string;
    caption: string;
  }[];

  // Venue / contact content shared across public pages
  venueName?: string;
  venueAddress?: string;
  venuePhone?: string;
  venueEmail?: string;
  venueOperatingHoursText?: string;
  venueRating?: number;

  // Contact page content
  contactQuickActions?: {
    id: string;
    icon: string;
    title: string;
    description: string;
    actionType: string;
    actionValue: string;
    color: string;
  }[];
  contactFaqs?: {
    id: string;
    question: string;
    answer: string;
  }[];

  // User home social proof
  reviews?: {
    id: string;
    name: string;
    rating: number;
    comment: string;
    date: string;
  }[];
}

interface LandingPageContextType {
  content: LandingPageContent;
  updateContent: (content: Partial<LandingPageContent>) => Promise<void>;
}

const LandingPageContext = createContext<LandingPageContextType | undefined>(undefined);

const RAW_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';
const API_BASE_URL =
  typeof window !== 'undefined' && window.location.hostname.includes('localhost')
    ? '/api'
    : RAW_API_BASE_URL;

const EMPTY_LANDING_CONTENT: LandingPageContent = {
  heroTitle: '',
  heroSubtitle: '',
  heroDescription: '',
  heroCTA: '',
  heroSecondaryButton: '',
  heroImage: '',
  features: [],
  stats: [],
  aboutTitle: '',
  aboutDescription: '',
  aboutImage: '',
  galleryTitle: '',
  gallerySubtitle: '',
  gallery: [],
  contactQuickActions: [],
  contactFaqs: [],
  reviews: [],
};

const normalizeLandingContent = (content: Partial<LandingPageContent> | null | undefined): LandingPageContent => {
  const nextContent = { ...EMPTY_LANDING_CONTENT, ...(content || {}) };

  return {
    ...nextContent,
    features: Array.isArray(content?.features) ? content.features : [],
    stats: Array.isArray(content?.stats) ? content.stats : [],
    gallery: Array.isArray(content?.gallery) ? content.gallery : [],
    contactQuickActions: Array.isArray(content?.contactQuickActions) ? content.contactQuickActions : [],
    contactFaqs: Array.isArray(content?.contactFaqs) ? content.contactFaqs : [],
    reviews: Array.isArray(content?.reviews) ? content.reviews : [],
  };
};

export const LandingPageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<LandingPageContent>(EMPTY_LANDING_CONTENT);

  useEffect(() => {
    let active = true;

    const loadRemoteContent = async () => {
      try {
        const [settingsResponse, galleryResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/settings`),
          fetch(`${API_BASE_URL}/gallery`),
        ]);

        const settingsPayload = await settingsResponse.json();
        const galleryPayload = await galleryResponse.json();
        const remoteContent = settingsPayload?.settings?.landing;
        const remoteGallery = Array.isArray(galleryPayload?.gallery) ? galleryPayload.gallery : [];

        if (!active || !remoteContent || typeof remoteContent !== 'object') {
          return;
        }

        setContent(normalizeLandingContent({
          ...(remoteContent as Partial<LandingPageContent>),
          gallery: remoteGallery,
        }));
      } catch {
        // Keep the empty state if the backend is temporarily unavailable.
      }
    };

    void loadRemoteContent();

    const handleSettingsUpdated = () => {
      void loadRemoteContent();
    };

    const pollTimer = window.setInterval(() => {
      void loadRemoteContent();
    }, 30000);

    window.addEventListener('tcy:settings-updated', handleSettingsUpdated);

    return () => {
      active = false;
      window.clearInterval(pollTimer);
      window.removeEventListener('tcy:settings-updated', handleSettingsUpdated);
    };
  }, []);

  const updateContent = async (newContent: Partial<LandingPageContent>) => {
    const { gallery: _gallery, ...rest } = newContent;
    const nextContent = normalizeLandingContent({ ...content, ...rest, gallery: content.gallery });
    setContent(nextContent);

    try {
      const token = await getCurrentUserToken();
      if (!token) {
        throw new Error('Please sign in again and retry.');
      }

      const response = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ landing: nextContent }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message || 'Unable to sync landing content to server');
      }

      window.dispatchEvent(new CustomEvent('tcy:settings-updated'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sync landing content to server';
      showErrorToast('Save failed', message);
      throw error;
    }
  };

  return (
    <LandingPageContext.Provider value={{ content, updateContent }}>
      {children}
    </LandingPageContext.Provider>
  );
};

export const useLandingPage = () => {
  const context = useContext(LandingPageContext);
  if (!context) {
    throw new Error('useLandingPage must be used within LandingPageProvider');
  }
  return context;
};