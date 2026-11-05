// sitting cat silhouette, seen from behind 3/4, origin at bottom center, height ~ 100 units
export function catD(x, y, s, flip = 1) {
  const P = (px, py) => `${(x + px * s * flip).toFixed(1)},${(y + py * s).toFixed(1)}`;
  return `M${P(-30,0)} C${P(-38,-20)} ${P(-34,-52)} ${P(-18,-66)} C${P(-16,-74)} ${P(-20,-82)} ${P(-18,-90)} L${P(-20,-106)} L${P(-9,-96)} C${P(-4,-98)} ${P(2,-98)} ${P(7,-96)} L${P(16,-106)} L${P(16,-89)} C${P(20,-80)} ${P(16,-70)} ${P(12,-66)} C${P(26,-54)} ${P(32,-28)} ${P(28,0)} C${P(40,0)} ${P(54,-4)} ${P(58,-16)} C${P(62,-28)} ${P(56,-40)} ${P(62,-46)} C${P(66,-42)} ${P(66,-30)} ${P(64,-18)} C${P(60,0)} ${P(42,8)} ${P(26,6)} Z`;
}
