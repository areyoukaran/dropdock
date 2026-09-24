const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

let initialized = false;

export function initAnalytics() {
  if (initialized || !GA_MEASUREMENT_ID) {
    return;
  }

  if (typeof window === 'undefined') {
    return;
  }

  if (window.gtag) {
    initialized = true;
    return;
  }

  window.dataLayer = window.dataLayer || [];

  window.gtag = function () {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());

  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: true,
  });

  const script = document.createElement('script');

  script.async = true;
  script.src =
    `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;

  document.head.appendChild(script);

  initialized = true;
}

export function trackEvent(eventName, parameters = {}) {
  if (
    typeof window === 'undefined' ||
    !window.gtag ||
    !GA_MEASUREMENT_ID
  ) {
    return;
  }

  window.gtag('event', eventName, parameters);
}

export function trackDropCreated({
  contentType,
  expiration,
  passwordProtected,
} = {}) {
  trackEvent('drop_created', {
    content_type: contentType,
    expiration,
    password_protected: passwordProtected,
  });
}

export function trackDropOpened({ contentType } = {}) {
  trackEvent('drop_opened', {
    content_type: contentType,
  });
}

export function trackDropDownloaded({ contentType } = {}) {
  trackEvent('drop_downloaded', {
    content_type: contentType,
  });
}

export function trackDropViewed({ contentType } = {}) {
  trackEvent('drop_viewed', {
    content_type: contentType,
  });
}

export function trackShare({ method } = {}) {
  trackEvent('share', {
    method,
  });
}