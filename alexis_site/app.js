// Progressive enhancement only. Navigation and images work without JavaScript.
document.querySelectorAll('img').forEach(image => {
  const fallback = () => {
    const placeholder = document.createElement('div');
    placeholder.className = 'image-placeholder';
    placeholder.setAttribute('role', 'img');
    placeholder.setAttribute('aria-label', image.alt + ' Fotografía no disponible.');
    placeholder.textContent = 'Fotografía no disponible';
    image.replaceWith(placeholder);
  };
  image.addEventListener('error', fallback, { once: true });
  if (image.complete && !image.naturalWidth) fallback();
});
