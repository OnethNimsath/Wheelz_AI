document.addEventListener('DOMContentLoaded', () => {
    const brandFilterBtn = document.getElementById('brandFilterBtn');
    const brandDropdown = document.getElementById('brandDropdown');

    // Toggle dropdown visibility
    brandFilterBtn.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent click from immediately propagating to document and closing dropdown
        brandDropdown.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
        if (!brandDropdown.contains(event.target) && !brandFilterBtn.contains(event.target)) {
            brandDropdown.classList.add('hidden');
        }
    });

    // Optional: Handle clicks on dropdown items (e.g., to filter results)
    brandDropdown.querySelectorAll('a').forEach(item => {
        item.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent default link behavior if you want to filter dynamically
            console.log('Selected Brand:', event.target.textContent);
            // Here you would implement your filtering logic
            // For now, it just logs the selected brand
            brandDropdown.classList.add('hidden'); // Close dropdown after selection
        });
    });
});

const vehicleTypeFilterBtn = document.getElementById('vehicleTypeFilterBtn');
            const vehicleTypeDropdown = document.getElementById('vehicleTypeDropdown');

            // Toggle dropdown visibility for Vehicle Type
            vehicleTypeFilterBtn.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent click from immediately propagating to document and closing dropdown
                vehicleTypeDropdown.classList.toggle('hidden');
                // Close other dropdowns if open
                brandDropdown.classList.add('hidden');
            });

            // Handle clicks on Vehicle Type dropdown items
            vehicleTypeDropdown.querySelectorAll('a').forEach(item => {
                item.addEventListener('click', (event) => {
                    event.preventDefault();
                    console.log('Selected Vehicle Type:', event.target.textContent);
                    // Implement filtering logic for vehicle type here
                    vehicleTypeDropdown.classList.add('hidden');
                });
            });


            // --- Global click listener to close all dropdowns when clicking outside ---
            document.addEventListener('click', (event) => {
                if (!brandDropdown.contains(event.target) && !brandFilterBtn.contains(event.target)) {
                    brandDropdown.classList.add('hidden');
                }
                if (!vehicleTypeDropdown.contains(event.target) && !vehicleTypeFilterBtn.contains(event.target)) {
                    vehicleTypeDropdown.classList.add('hidden');
                }
            });
