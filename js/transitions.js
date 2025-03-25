document.addEventListener('DOMContentLoaded', () => {
    // Crear overlay de transición
    function createTransitionOverlay() {
        const existingOverlay = document.querySelector('.transition-overlay');
        if (existingOverlay) return existingOverlay;

        const overlay = document.createElement('div');
        overlay.classList.add('transition-overlay');
        
        const loader = document.createElement('div');
        loader.classList.add('transition-loader');
        overlay.appendChild(loader);
        
        document.body.appendChild(overlay);
        return overlay;
    }

    const transitionOverlay = createTransitionOverlay();

    // Preparar página para transición
    function preparePageTransition() {
        document.body.classList.add('page-transition-enter');
        setTimeout(() => {
            document.body.classList.add('page-transition-enter-active');
        }, 10);
    }

    // Manejar transiciones entre páginas
    function setupPageTransitions() {
        const links = document.querySelectorAll('a[href]:not([href="#"])');
        
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                // Prevenir navegación inmediata
                e.preventDefault();
                const targetUrl = link.getAttribute('href');

                // Activar overlay de transición
                transitionOverlay.classList.add('active');

                // Navegar después de la animación
                setTimeout(() => {
                    window.location.href = targetUrl;
                }, 500);
            });
        });
    }

    // Inicializar transiciones
    preparePageTransition();
    setupPageTransitions();

    // Limpiar clases de transición al cargar
    window.addEventListener('load', () => {
        document.body.classList.remove('page-transition-enter', 'page-transition-enter-active');
        transitionOverlay.classList.remove('active');
    });
});