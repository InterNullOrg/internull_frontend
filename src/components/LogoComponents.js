import React from 'react';

// Try to load logos with fallback
const MainLogo = ({ height = 40, style = {} }) => {
  const [logoSrc, setLogoSrc] = React.useState(`${process.env.PUBLIC_URL}/logo/main-logo.png`);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    // Try different paths
    const paths = [
      `${process.env.PUBLIC_URL}/logo/main-logo.png`,
      '/logo/main-logo.png',
      './logo/main-logo.png'
    ];

    // Test which path works
    const img = new Image();
    let pathIndex = 0;

    const tryNextPath = () => {
      if (pathIndex < paths.length) {
        img.src = paths[pathIndex];
        pathIndex++;
      } else {
        setHasError(true);
      }
    };

    img.onload = () => {
      setLogoSrc(img.src);
    };

    img.onerror = tryNextPath;
    tryNextPath();
  }, []);

  if (hasError) {
    // Fallback to text
    return (
      <div style={{
        height,
        display: 'flex',
        alignItems: 'center',
        fontWeight: 'bold',
        fontSize: height * 0.4,
        color: '#667eea',
        ...style
      }}>
        INTERNULL
      </div>
    );
  }

  return (
    <img
      src={logoSrc}
      alt="Internull Logo"
      style={{ height, ...style }}
      onError={() => setHasError(true)}
    />
  );
};

const MinimalistDarkLogo = ({ height = 32, style = {} }) => {
  const [logoSrc, setLogoSrc] = React.useState(`${process.env.PUBLIC_URL}/logo/minimalist-dark.png`);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    // Try different paths
    const paths = [
      `${process.env.PUBLIC_URL}/logo/minimalist-dark.png`,
      '/logo/minimalist-dark.png',
      './logo/minimalist-dark.png'
    ];

    // Test which path works
    const img = new Image();
    let pathIndex = 0;

    const tryNextPath = () => {
      if (pathIndex < paths.length) {
        img.src = paths[pathIndex];
        pathIndex++;
      } else {
        setHasError(true);
      }
    };

    img.onload = () => {
      setLogoSrc(img.src);
    };

    img.onerror = tryNextPath;
    tryNextPath();
  }, []);

  if (hasError) {
    // Return empty since this is secondary branding
    return null;
  }

  return (
    <img
      src={logoSrc}
      alt="Internull"
      style={{ height, ...style }}
      onError={() => setHasError(true)}
    />
  );
};

export { MainLogo, MinimalistDarkLogo };