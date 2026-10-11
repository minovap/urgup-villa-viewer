// Solar position (NOAA Solar Calculator / Meeus "Astronomical Algorithms" formulas, ~0.01 deg accuracy
// for 1800-2100). No refraction correction except the standard NOAA one for the apparent elevation.
//   sunPosition(utcMs, latDeg, lonDeg) -> { azimuth (deg, from true north clockwise), elevation (deg) }
const RAD = Math.PI / 180, DEG = 180 / Math.PI;

export function sunPosition(utcMs, lat, lon) {
  const jd = utcMs / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;                                     // Julian centuries since J2000
  const L0 = ((280.46646 + T * (36000.76983 + T * 0.0003032)) % 360 + 360) % 360;   // geom. mean longitude
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);               // mean anomaly
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);          // orbit eccentricity
  const C = Math.sin(M * RAD) * (1.914602 - T * (0.004817 + 0.000014 * T))
          + Math.sin(2 * M * RAD) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * RAD) * 0.000289;
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * RAD);   // apparent longitude
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * RAD);                     // corrected obliquity
  const decl = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD));   // declination (rad)
  const y = Math.tan(eps * RAD / 2) ** 2;
  const eqTime = 4 * DEG * (y * Math.sin(2 * L0 * RAD) - 2 * e * Math.sin(M * RAD)
    + 4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD)
    - 0.5 * y * y * Math.sin(4 * L0 * RAD) - 1.25 * e * e * Math.sin(2 * M * RAD));   // minutes
  const d = new Date(utcMs);
  const utcMin = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60 + d.getUTCMilliseconds() / 60000;
  let tst = (utcMin + eqTime + 4 * lon) % 1440; if (tst < 0) tst += 1440;   // true solar time (min)
  const ha = (tst / 4 - 180) * RAD;                                       // hour angle
  const phi = lat * RAD;
  const cosZ = Math.min(1, Math.max(-1, Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(ha)));
  const zen = Math.acos(cosZ);
  // azimuth from north, clockwise
  let az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)) * DEG + 180;
  az = (az % 360 + 360) % 360;
  let elev = 90 - zen * DEG;
  // NOAA atmospheric refraction approximation (deg)
  const te = Math.tan(elev * RAD);
  let refr = 0;
  if (elev > 85) refr = 0;
  else if (elev > 5) refr = 58.1 / te - 0.07 / te ** 3 + 0.000086 / te ** 5;
  else if (elev > -0.575) refr = 1735 + elev * (-518.2 + elev * (103.4 + elev * (-12.79 + elev * 0.711)));
  else refr = -20.774 / te;
  elev += refr / 3600;
  return { azimuth: az, elevation: elev, declination: decl * DEG, eqTime };
}

// ISO-8601 week helpers (weeks start on Monday; week 1 contains the year's first Thursday)
// thursdayOfIsoWeek(year, week) -> Date (UTC midnight) of the Thursday of that ISO week
export function thursdayOfIsoWeek(year, week) {
  const jan4 = Date.UTC(year, 0, 4);
  const dow = (new Date(jan4).getUTCDay() + 6) % 7;                       // 0 = Monday
  const mondayW1 = jan4 - dow * 86400000;
  return new Date(mondayW1 + ((week - 1) * 7 + 3) * 86400000);
}
export function isoWeekOf(dateUtcMidnight) {
  const d = new Date(dateUtcMidnight);
  const dow = (d.getUTCDay() + 6) % 7;
  const thu = new Date(d.getTime() + (3 - dow) * 86400000);               // the Thursday of this week
  const y = thu.getUTCFullYear();
  const w = 1 + Math.round((thu - thursdayOfIsoWeek(y, 1)) / (7 * 86400000));
  return { year: y, week: w };
}
