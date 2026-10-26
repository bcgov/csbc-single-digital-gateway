import { Cookie } from 'k6/browser';
import http from 'k6/http';

interface CookieOptions {
  domain?: string;
  path?: string;
  secure?: boolean;
  expires?: string;
  http_only?: boolean;
}

interface JarCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expiry?: number;
  httpOnly?: boolean;
  secure?: boolean;
}

export enum UserType {
  Platform = 'platform',
  Client = 'client',
}

// Load client cookies from JSON file
export const clientCookieData: { cookies: Cookie[] } = JSON.parse(
  open('./cookies/client-auth-cookies.json'),
);

// Load platform cookies from JSON file
export const platformCookieData: { cookies: Cookie[] } = JSON.parse(
  open('./cookies/platform-auth-cookies.json'),
);

/**
 * Formats a timestamp into a cookie expiry string.
 * @param {number} timestamp - The expiry time as a UNIX timestamp.
 * @returns The formatted expiry string.
 */
const formattedExpiry = (timestamp: number) => {
  const date = new Date(timestamp * 1000);

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const weekday = weekdays[date.getUTCDay()];
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  const second = String(date.getUTCSeconds()).padStart(2, '0');

  return `${weekday}, ${day} ${month} ${year} ${hour}:${minute}:${second} MST`;
};

/**
 * Utility function to set cookies from a JSON file into the k6 Cookie Jar.
 * @param {JarCookie[]} cookieData - An array of cookie objects loaded from the JSON file.
 * @param {UserType} userType - User type as either admin or client.
 */
export const setCookies = (cookieData: { cookies: JarCookie[] }, userType: UserType) => {
  const jar = http.cookieJar();
  cookieData.cookies.forEach((cookie) => {
    let expiresOption: CookieOptions = {
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
    };
    if (cookie.expiry) {
      expiresOption = {
        ...expiresOption,
        expires: formattedExpiry(cookie.expiry),
      };
    } else if (cookie.httpOnly) {
      expiresOption = {
        ...expiresOption,
        http_only: cookie.httpOnly,
      };
    }
    const webUrl =
      userType === UserType.Platform ? __ENV.K6_PLATFORM_DEV_URL : __ENV.K6_CLIENT_DEV_URL;
    jar.set(webUrl, cookie.name, cookie.value, expiresOption);
  });
};
