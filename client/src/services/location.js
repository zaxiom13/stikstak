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

  // Convert to safe format (PeerJS doesn't allow consecutive dashes or certain special chars)
  // Replace negative signs with 'n' prefix (e.g., -2 becomes 'n2')
  const latSafe = latZone < 0 ? `n${Math.abs(latZone)}` : latZone;
  const lonSafe = lonZone < 0 ? `n${Math.abs(lonZone)}` : lonZone;

  // Get the current date as YYYY-MM-DD, replace dashes with underscores
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  // Use underscores instead of dashes to avoid PeerJS ID validation issues
  return `yikyak_zone_${latSafe}_${lonSafe}_${today}`;
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
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `yikyak_zone_denied_${today}`;
  }
};
