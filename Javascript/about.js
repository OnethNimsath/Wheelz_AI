document.addEventListener('DOMContentLoaded', () => {
    const valueItems = document.querySelectorAll('.value-item');

    valueItems.forEach(item => {
      // Add animation on mouse enter
      item.addEventListener('mouseenter', () => {
        // Optional: Remove animation from other items if you want only one active at a time
        // valueItems.forEach(otherItem => {
        //   if (otherItem !== item) {
        //     otherItem.classList.remove('animate-bounce-once');
        //   }
        // });

        // Add the animation class
        item.classList.add('animate-bounce-once');
      });

      // Remove animation on mouse leave
      item.addEventListener('mouseleave', () => {
        item.classList.remove('animate-bounce-once');
      });

      // To ensure the animation restarts each time you hover (optional, but often desired for hover effects)
      // We listen for animationend and remove/add the class to allow re-triggering
      item.addEventListener('animationend', () => {
        if (!item.matches(':hover')) { // Only remove if the mouse is no longer over the item
          item.classList.remove('animate-bounce-once');
        }
      });

      const browseBtn = document.getElementById('browseVehiclesBtn');

      if (browseBtn) {
        browseBtn.addEventListener('click', () => {
          browseBtn.classList.remove('animate-button-press');
          void browseBtn.offsetWidth; // Force reflow
          browseBtn.classList.add('animate-button-press');

          browseBtn.addEventListener('animationend', () => {
            browseBtn.classList.remove('animate-button-press');
          }, { once: true });
        });
      }
    });

    });
