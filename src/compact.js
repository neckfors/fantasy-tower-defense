// A "Less / More" button for a side box: less keeps icons, names, stars and prices, and hides the explanations.
export function compactToggle(box, parent, key) {
  const btn = document.createElement('button');
  btn.className = 'sizebtn';
  let small = false;
  try { small = localStorage.getItem(key) === '1'; } catch {}
  const apply = () => {
    box.classList.toggle('compact', small);
    btn.textContent = small ? '＋ More' : '－ Less';
    btn.title = small ? 'Show the explanations' : 'Take up less space';
  };
  btn.onclick = () => {
    small = !small;
    try { localStorage.setItem(key, small ? '1' : '0'); } catch {}
    apply();
  };
  apply();
  parent.appendChild(btn);
}
