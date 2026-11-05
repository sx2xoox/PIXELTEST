const K = [['NanumMyeongjo', 800], ['Gowun Batang', 700], ['Pretendard', 700], ['Gowun Dodum', 400]];
const L = [['Fraunces', 600, 0.12], ['Cormorant Garamond', 700, 0.14], ['Inter', 600, 0.2], ['Space Grotesk', 500, 0.18]];
export default () => ({
  width: 1600, height: 900, background: '#f3ebdd',
  children: K.flatMap(([f, w], i) => [
    { type: 'text', x: 40, y: 110 + i * 210, text: '새벽 로스터리', size: 80, font: f, weight: w, fill: '#2b1a12', letterSpacing: -2 },
    { type: 'text', x: 40, y: 160 + i * 210, text: f + ' ' + w, size: 18, fill: '#8a6a50' },
    { type: 'text', x: 800, y: 100 + i * 210, text: 'DAWN ROASTERY', size: 56, font: L[i][0], weight: L[i][1], fill: '#2b1a12', letterSpacing: 56 * L[i][2] },
    { type: 'text', x: 800, y: 160 + i * 210, text: 'Dawn Roastery · Seongsu 1984', size: 40, font: L[i][0], weight: L[i][1], fill: '#2b1a12' },
  ]),
});
