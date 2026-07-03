export function mountApp(root: HTMLDivElement): void {
  root.innerHTML = `
    <main class="app-shell" aria-label="烬璃纪元">
      <section class="first-screen">
        <h1>烬璃纪元</h1>
        <p>炉山市集正在加载。</p>
      </section>
    </main>
  `;
}
