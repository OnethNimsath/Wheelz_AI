// DOM elements
const advancedFiltersBtn = document.querySelector('.advanced-filters-btn');
const filtersSidebar = document.querySelector('.filters-sidebar');
const showMoreBtn = document.querySelector('.show-more');
const conditionBtns = document.querySelectorAll('.condition-btn');
const resetBtn = document.querySelector('.reset-btn');
const applyBtn = document.querySelector('.apply-btn');
const saveBtns = document.querySelectorAll('.save-btn');
const priceRangeSlider = document.querySelector('.range-slider');
const sortSelect = document.querySelector('.sort-select');
const paginationItems = document.querySelectorAll('.page-item');

// Toggle mobile filters visibility
let filtersVisible = true;

// Only hide filters on mobile by default
if (window.innerWidth < 991) {
    filtersSidebar.style.display = 'none';
    filtersVisible = false;
}

advancedFiltersBtn.addEventListener('click', function() {
    filtersVisible = !filtersVisible;
    filtersSidebar.style.display = filtersVisible ? 'block' : 'none';
});

// Show more brands
showMoreBtn.addEventListener('click', function() {
    const hiddenBrands = [
        'BMW', 'Mercedes-Benz', 'Audi', 'Hyundai', 'Kia'
    ];
    
    const checkboxList = document.querySelector('.checkbox-list');
    
    if (this.textContent === 'Show more') {
        hiddenBrands.forEach(brand => {
            const label = document.createElement('label');
            label.className = 'checkbox-item hidden-brand';
            label.innerHTML = `<input type="checkbox"> ${brand}`;
            checkboxList.appendChild(label);
        });
        this.textContent = 'Show less';
    } else {
        const hiddenElements = document.querySelectorAll('.hidden-brand');
        hiddenElements.forEach(el => el.remove());
        this.textContent = 'Show more';
    }
});

// Condition buttons selection
conditionBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        // If it's already active and not the only active one, toggle it off
        const activeButtons = document.querySelectorAll('.condition-btn.active');
        
        if (this.classList.contains('active') && activeButtons.length > 1) {
            this.classList.remove('active');
        } else {
            this.classList.add('active');
        }
    });
});

// Reset filters
resetBtn.addEventListener('click', function() {
    // Reset checkboxes
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Reset price range
    priceRangeSlider.value = 5000000;
    
    // Reset selects
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        select.selectedIndex = 0;
    });
    
    // Reset condition buttons (only first one active)
    conditionBtns.forEach((btn, index) => {
        if (index === 0) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
});

// Apply filters (simulate)
applyBtn.addEventListener('click', function() {
    // In a real application, this would submit the filter form or make an AJAX request
    alert('Filters applied! This would trigger a search with the selected filters.');
});

// Save buttons toggle
saveBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        const svg = this.querySelector('svg');
        
        if (svg.innerHTML.includes('fill-rule="evenodd"')) {
            // Switch to filled heart
            svg.innerHTML = '<path d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"/>';
            this.style.color = '#e74c3c';
            this.style.borderColor = '#e74c3c';
        } else {
            // Switch to outline heart
            svg.innerHTML = '<path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z"/>';
            this.style.color = '#0d1b42';
            this.style.borderColor = '#0d1b42';
        }
    });
});

// Price range slider value display
priceRangeSlider.addEventListener('input', function() {
    const value = this.value;
    const formattedValue = parseInt(value).toLocaleString('en-LK');
    document.querySelector('.price-range-values').innerHTML = `<span>Min</span><span>LKR ${formattedValue}</span>`;
});

// Sort select change
sortSelect.addEventListener('change', function() {
    // In a real application, this would trigger a re-sort of the results
    console.log('Sort changed to:', this.value);
});

// Pagination
paginationItems.forEach(item => {
    item.addEventListener('click', function() {
        if (!this.classList.contains('active')) {
            document.querySelector('.page-item.active').classList.remove('active');
            this.classList.add('active');
            
            // In a real application, this would load the corresponding page
            const pageContent = this.textContent.trim();
            if (pageContent.match(/^\d+$/)) {
                console.log('Navigate to page:', pageContent);
            }
        }
    });
});

// Toggle mobile menu
const menuToggle = document.getElementById('menuToggle');
        const navLinks = document.getElementById('navLinks');
        
        menuToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
        });


// Window resize handler for responsive behavior
window.addEventListener('resize', function() {
    if (window.innerWidth >= 991) {
        filtersSidebar.style.display = 'block';
        filtersVisible = true;
    } else {
        filtersSidebar.style.display = filtersVisible ? 'block' : 'none';
    }
});