# check the low-precision sun/moon formulas (as they will be written in JS) against PyEphem
import math, ephem, datetime
LAT, LON = 50.4705, 10.7801; D2R = math.pi / 180; R2D = 180 / math.pi
sin, cos, asin, atan2, tan = math.sin, math.cos, math.asin, math.atan2, math.tan
def sunAt(jd):
    T = (jd - 2451545) / 36525; L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360; M = (357.52911 + T * (35999.05029 - 0.0001537 * T)) * D2R
    C = sin(M) * (1.914602 - T * (0.004817 + 0.000014 * T)) + sin(2 * M) * (0.019993 - 0.000101 * T) + sin(3 * M) * 0.000289; om = (125.04 - 1934.136 * T) * D2R
    lam = (L0 + C - 0.00569 - 0.00478 * sin(om)) * D2R; eps = (23.439291 - 0.0130042 * T + 0.00256 * cos(om)) * D2R
    return dict(ra=atan2(cos(eps) * sin(lam), cos(lam)), dec=asin(sin(eps) * sin(lam)), lam=lam)
def gmst(jd): d = jd - 2451545; T = d / 36525; return ((280.46061837 + 360.98564736629 * d + T * T * (0.000387933 - T / 38710000)) % 360 + 360) % 360
def horiz(ra, dec, lst):
    H = lst * D2R - ra; la = LAT * D2R; el = asin(sin(la) * sin(dec) + cos(la) * cos(dec) * cos(H))
    az = atan2(sin(H), cos(H) * sin(la) - tan(dec) * cos(la)) * R2D + 180; return (az + 360) % 360, el * R2D
def refr(el): 
    if el < -1.6: return 0
    h = max(el, -1.5); return 1.02 / tan((h + 10.3 / (h + 5.11)) * D2R) / 60
def moonAt(jd):
    T = (jd - 2451545) / 36525; d = lambda x: x * D2R
    lam = 218.32 + 481267.881 * T + 6.29 * sin(d(135.0 + 477198.87 * T)) - 1.27 * sin(d(259.3 - 413335.36 * T)) + 0.66 * sin(d(235.7 + 890534.22 * T)) + 0.21 * sin(d(269.9 + 954397.74 * T)) - 0.19 * sin(d(357.5 + 35999.05 * T)) - 0.11 * sin(d(186.5 + 966404.03 * T))
    bet = 5.13 * sin(d(93.3 + 483202.02 * T)) + 0.28 * sin(d(228.2 + 960400.89 * T)) - 0.28 * sin(d(318.3 + 6003.15 * T)) - 0.17 * sin(d(217.6 - 407332.21 * T))
    par = 0.9508 + 0.0518 * cos(d(135.0 + 477198.87 * T)) + 0.0095 * cos(d(259.3 - 413335.36 * T)) + 0.0078 * cos(d(235.7 + 890534.22 * T)) + 0.0028 * cos(d(269.9 + 954397.74 * T))
    eps = d(23.439 - 0.013 * T); l = d(lam); b = d(bet)
    x = cos(b) * cos(l); y = cos(eps) * cos(b) * sin(l) - sin(eps) * sin(b); z = sin(eps) * cos(b) * sin(l) + cos(eps) * sin(b)
    return dict(ra=atan2(y, x), dec=asin(z), lam=l, bet=b, par=par)
def sky(jd):
    lst = (gmst(jd) + LON) % 360; so = sunAt(jd); mo = moonAt(jd)
    saz, sel = horiz(so['ra'], so['dec'], lst); maz, mel = horiz(mo['ra'], mo['dec'], lst); mel -= mo['par'] * cos(mel * D2R)
    psi = math.acos(max(-1, min(1, cos(mo['bet']) * cos(mo['lam'] - so['lam'])))); illum = (1 - cos(psi)) / 2
    return saz, sel + refr(sel), maz, mel + refr(mel), illum
obs = ephem.Observer(); obs.lat = str(LAT); obs.lon = str(LON); obs.elevation = 330; obs.pressure = 1010; obs.temp = 15
for (y, mo_, d, h, mi) in [(2026, 6, 1, 3, 0), (2026, 6, 1, 10, 0), (2026, 6, 1, 19, 15), (2026, 6, 1, 21, 30), (2026, 6, 1, 23, 0), (2026, 10, 21, 16, 0), (2026, 12, 21, 11, 0), (2026, 8, 27, 21, 30)]:
    dt = datetime.datetime(y, mo_, d, h, mi); jd = (dt - datetime.datetime(1970, 1, 1)).total_seconds() / 86400 + 2440587.5
    obs.date = ephem.Date(dt); s = ephem.Sun(obs); m = ephem.Moon(obs)
    saz, sel, maz, mel, il = sky(jd)
    print(dt, 'UTC  sun az %.2f/%.2f el %.2f/%.2f   moon az %.2f/%.2f el %.2f/%.2f  illum %.3f/%.3f' % (saz, float(s.az) * R2D, sel, float(s.alt) * R2D, maz, float(m.az) * R2D, mel, float(m.alt) * R2D, il, m.moon_phase))
