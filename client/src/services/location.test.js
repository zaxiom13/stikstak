import { getLocationCode } from './location';

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
};

global.navigator.geolocation = mockGeolocation;

describe('Location Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLocationCode()', () => {
    test('should generate valid zone ID for positive coordinates', async () => {
      const mockPosition = {
        coords: {
          latitude: 51.59,
          longitude: -2.00
        }
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const locationCode = await getLocationCode();
      
      // Should handle negative longitude without double dashes
      expect(locationCode).toMatch(/^yikyak_zone_\d+_n\d+_\d{8}$/);
      expect(locationCode).not.toContain('--'); // No consecutive dashes
      expect(locationCode).not.toContain('- '); // No dash-space
      console.log('Generated ID:', locationCode);
    });

    test('should generate valid zone ID for negative latitude and longitude', async () => {
      const mockPosition = {
        coords: {
          latitude: -33.87,
          longitude: -151.21
        }
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const locationCode = await getLocationCode();
      
      // Both should have 'n' prefix for negative
      expect(locationCode).toMatch(/^yikyak_zone_n\d+_n\d+_\d{8}$/);
      expect(locationCode).not.toContain('--');
      console.log('Generated ID:', locationCode);
    });

    test('should generate valid zone ID for all positive coordinates', async () => {
      const mockPosition = {
        coords: {
          latitude: 40.71,
          longitude: 74.01
        }
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const locationCode = await getLocationCode();
      
      // No 'n' prefix needed for coordinates (but 'zone' has an 'n')
      expect(locationCode).toMatch(/^yikyak_zone_\d+_\d+_\d{8}$/);
      // Check that coordinates don't have 'n' prefix (negative indicator)
      const parts = locationCode.split('_');
      expect(parts[2]).not.toMatch(/^n/); // latitude should not start with 'n'
      expect(parts[3]).not.toMatch(/^n/); // longitude should not start with 'n'
      expect(locationCode).not.toContain('--');
      console.log('Generated ID:', locationCode);
    });

    test('should use underscores instead of dashes', async () => {
      const mockPosition = {
        coords: {
          latitude: 51.59,
          longitude: -2.00
        }
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const locationCode = await getLocationCode();
      
      // Should use underscores as separators
      expect(locationCode).toContain('_');
      // Should not have dashes (except potentially in date, but we replace those too)
      expect(locationCode.split('yikyak_zone_')[1]).not.toContain('-');
    });

    test('should generate fallback zone on error', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(new Error('Location denied'));
      });

      const locationCode = await getLocationCode();
      
      expect(locationCode).toMatch(/^yikyak_zone_denied_\d{8}$/);
      expect(locationCode).not.toContain('--');
      expect(locationCode).not.toContain('-'); // Date should have no dashes
      console.log('Fallback ID:', locationCode);
    });

    test('should handle edge case coordinates', async () => {
      // Test coordinates that previously caused issues
      const testCases = [
        { lat: 51.59, lon: -2.00, desc: 'UK (negative lon)' },
        { lat: -33.87, lon: 151.21, desc: 'Sydney (negative lat)' },
        { lat: 0, lon: 0, desc: 'Equator/Prime Meridian' },
        { lat: -0.01, lon: -0.01, desc: 'Near zero negative' },
        { lat: 89.99, lon: 179.99, desc: 'Near poles' },
        { lat: -89.99, lon: -179.99, desc: 'Near south pole' }
      ];

      for (const testCase of testCases) {
        mockGeolocation.getCurrentPosition.mockImplementation((success) => {
          success({
            coords: {
              latitude: testCase.lat,
              longitude: testCase.lon
            }
          });
        });

        const locationCode = await getLocationCode();
        
        // Validate format
        expect(locationCode).toMatch(/^yikyak_zone_/);
        expect(locationCode).not.toContain('--');
        expect(locationCode).not.toContain(' ');
        
        console.log(`${testCase.desc}: ${locationCode}`);
      }
    });

    test('should generate consistent IDs for same location', async () => {
      const mockPosition = {
        coords: {
          latitude: 51.59,
          longitude: -2.00
        }
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const locationCode1 = await getLocationCode();
      const locationCode2 = await getLocationCode();
      
      expect(locationCode1).toBe(locationCode2);
    });

    test('should generate different IDs for different locations', async () => {
      // First location
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: { latitude: 51.59, longitude: -2.00 }
        });
      });
      const locationCode1 = await getLocationCode();

      // Second location
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: { latitude: 40.71, longitude: 74.01 }
        });
      });
      const locationCode2 = await getLocationCode();
      
      expect(locationCode1).not.toBe(locationCode2);
    });

    test('should handle geolocation not supported', async () => {
      const originalGeolocation = global.navigator.geolocation;
      delete global.navigator.geolocation;

      const locationCode = await getLocationCode();
      
      expect(locationCode).toMatch(/^yikyak_zone_denied_\d{8}$/);
      
      // Restore
      global.navigator.geolocation = originalGeolocation;
    });
  });

  describe('PeerJS ID Validation', () => {
    test('generated IDs should be valid for PeerJS', async () => {
      const mockPosition = {
        coords: {
          latitude: 51.59,
          longitude: -2.00
        }
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const locationCode = await getLocationCode();
      
      // PeerJS ID requirements:
      // - No consecutive dashes
      expect(locationCode).not.toMatch(/--/);
      // - No spaces
      expect(locationCode).not.toMatch(/\s/);
      // - Should be alphanumeric with underscores
      expect(locationCode).toMatch(/^[a-zA-Z0-9_]+$/);
    });
  });
});