const getCoordinates = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error('Geolocation is not supported by your browser.'));
    }
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });
};

const generateLocationCode = (latitude, longitude) => {
  // Truncate coordinates to create a "zone".
  // 2 decimal places is roughly a 1.1km area.
  const latZone = Math.floor(latitude * 100);
  const lonZone = Math.floor(longitude * 100);

  // Get the current date as YYYY-MM-DD
  const today = new Date().toISOString().slice(0, 10);

  return `yikyak-zone-${latZone}-${lonZone}-${today}`;
};

export const getLocationCode = async () => {
  try {
    const position = await getCoordinates();
    const { latitude, longitude } = position.coords;
    return generateLocationCode(latitude, longitude);
  } catch (error) {
    console.error("Error getting location:", error);
    // Fallback for when location is denied or fails.
    // This allows the app to still function, but in a global "denied" room.
    const today = new Date().toISOString().slice(0, 10);
    return `yikyak-zone-denied-${today}`;
  }
};
