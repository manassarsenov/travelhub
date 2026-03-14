const CountryPicker = (function () {

    const el = {
        wrapper: document.getElementById('tgWrapper'),
        dropdown: document.getElementById('tgDropdown'),
        list: document.getElementById('countryListItems'),
        input: document.getElementById('countryInput'),
        phoneCode: document.getElementById('phoneDialCode'),
        hidden: document.getElementById('country'),
        chevron: document.getElementById('selectorChevron'),
        phone: document.getElementById('phone'),
    };

    let current = null;
    let isOpen = false;

    function render(query = '') {
        const q = query.toLowerCase().trim();

        const filtered = COUNTRIES.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.dial.includes(q) ||
            c.code.toLowerCase().includes(q)
        );

        if (filtered.length === 0) {
            el.list.innerHTML = `
                <div class="tg-no-result">
                    <i class="fas fa-search"></i>
                    <span>No country found</span>
                </div>`;
            return;
        }

        el.list.innerHTML = filtered.map(c => `
            <div class="tg-item ${current?.code === c.code ? 'active' : ''}"
                 data-code="${c.code}">
                <span class="tg-item-flag">${c.flag || '🏳'}</span>
                <span class="tg-item-name">${c.name}</span>
                <span class="tg-item-code">${c.dial}</span>
            </div>
        `).join('');

        el.list.querySelectorAll('.tg-item').forEach(item => {
            item.addEventListener('click', () => {
                const found = COUNTRIES.find(c => c.code === item.dataset.code);
                if (found) select(found);
            });
        });
    }

    function select(country) {
        current = country;
        el.input.value = `${country.flag || ''} ${country.name}`;
        el.phoneCode.textContent = country.dial;
        el.hidden.value = country.code;
        el.phone.value = '';
        el.phone.maxLength = country.maxLength;

        document.getElementById('countryError').textContent = '';

        close();
    }

    function open() {
        isOpen = true;
        el.wrapper.classList.add('open');
        el.dropdown.classList.add('open');
        render(el.input.value === (current ? `${current.flag || ''} ${current.name}` : '') ? '' : el.input.value);
        el.input.select();
    }

    function close() {
        isOpen = false;
        el.wrapper.classList.remove('open');
        el.dropdown.classList.remove('open');
        if (current) {
            el.input.value = `${current.flag || ''} ${current.name}`;
        }
    }
    function selectCountry(country) {
    // Hidden select ga option qo'shish va tanlash
    const hiddenSelect = document.getElementById('country');
    hiddenSelect.innerHTML = `<option value="${country.code}" selected>${country.name}</option>`;

    // Input ko'rinishini yangilash
    document.getElementById('countryInput').value = country.name;

    // Telefon kodi
    document.getElementById('phoneDialCode').textContent = country.dial || '—';
}

    function initPhoneInput() {
        el.phone.addEventListener('keypress', e => {
            if (!/[0-9]/.test(e.key)) e.preventDefault();
            if (current && el.phone.value.length >= current.maxLength) e.preventDefault();
        });

        el.phone.addEventListener('paste', e => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text');
            const numbers = text.replace(/[^0-9]/g, '');
            el.phone.value = current ? numbers.slice(0, current.maxLength) : numbers;
        });

        el.phone.addEventListener('input', e => {
            let val = e.target.value.replace(/[^0-9]/g, '');
            if (current) val = val.slice(0, current.maxLength);
            e.target.value = val;
        });
    }

    function init() {
        el.input.addEventListener('click', e => {
            e.stopPropagation();
            if (!isOpen) open();
        });

        el.input.addEventListener('input', () => {
            if (!isOpen) open();
            render(el.input.value);
        });

        document.addEventListener('click', e => {
            if (!el.wrapper.contains(e.target)) close();
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && isOpen) close();
        });

        document.querySelector('form').addEventListener('submit', function (e) {
            if (!current) {
                e.preventDefault();
                document.getElementById('countryError').textContent = 'Please select a country';
                document.getElementById('countryError').style.display = 'block';
                return;
            }
            document.getElementById('countryError').textContent = '';
        });

        initPhoneInput();
        render();
    }

    return {init};
})();

document.addEventListener('DOMContentLoaded', () => {
    CountryPicker.init();
});