/* Shared data — branches, services, offers. Replace with real data later. */
window.KANAAN = {
  branches: [
    { slug: 'al-ain', name: 'Al Ain', area: 'Al Ain', address: 'Al Ain, UAE', phone: '+971505556795', whatsapp: '971505556795', img: '/assets/img/photos/arch-corridor-marble-1000.webp', type: 'Standard' },
    { slug: 'khalifa-city', name: 'Khalifa City', area: 'Khalifa City, Abu Dhabi', address: 'Khalifa City, Abu Dhabi', phone: '+971505556795', whatsapp: '971505556795', img: '/assets/img/photos/brand-logo-wall-1000.webp', type: 'Standard' },
    { slug: 'khalidiya', name: 'Khalidiya', area: 'Khalidiya, Abu Dhabi', address: 'Khalidiya, Abu Dhabi', phone: '+971505556795', whatsapp: '971505556795', img: '/assets/img/photos/service-hair-barber-stations-1000.webp', type: 'Standard' },
    { slug: 'baniyas-spa', name: 'Baniyas Spa', area: 'Baniyas, Abu Dhabi', address: 'Baniyas, Abu Dhabi', phone: '+971505556795', whatsapp: '971505556795', img: '/assets/img/photos/arch-marble-staircase-1000.webp', type: 'Spa' },
    { slug: 'baniyas-barber', name: 'Baniyas Barber', area: 'Baniyas, Abu Dhabi', address: 'Baniyas, Abu Dhabi', phone: '+971505556795', whatsapp: '971505556795', img: '/assets/img/photos/exterior-day-bilingual-1000.webp', type: 'Barber' },
    { slug: 'rabdan', name: 'Rabdan', area: 'Rabdan, Abu Dhabi', address: 'Rabdan, Abu Dhabi', phone: '+971505556795', whatsapp: '971505556795', img: '/assets/img/photos/arch-corridor-editorial-1000.webp', type: 'Standard' },
    { slug: 'old-shahamah', name: 'Old Shahamah', area: 'Old Shahamah, Abu Dhabi', address: 'Old Shahamah, Abu Dhabi', phone: '+971505556795', whatsapp: '971505556795', img: '/assets/img/photos/lounge-logo-wall-1000.webp', type: 'Standard' },
    { slug: 'new-shahamah', name: 'New Shahamah', area: 'New Shahamah, Abu Dhabi', address: 'New Shahamah, Abu Dhabi', phone: '+971505556795', whatsapp: '971505556795', img: '/assets/img/photos/arch-staircase-lemon-1000.webp', type: 'Standard' },
    { slug: 'muroor', name: 'Muroor', area: 'Muroor, Abu Dhabi', address: 'Muroor, Abu Dhabi', phone: '+971505556795', whatsapp: '971505556795', img: '/assets/img/photos/hero-exterior-night-1000.webp', type: 'Standard' },
    { slug: 'vip-muroor', name: 'VIP Muroor', area: 'Muroor, Abu Dhabi', address: 'Muroor, Abu Dhabi', phone: '+971505556795', whatsapp: '971505556795', img: '/assets/img/photos/vip-muroor-suite-1000.webp', type: 'VIP' }
  ],
  services: [
    { slug: 'hair-beard', name: 'Hair & Beard', desc: 'Precision cuts, classic shaves and beard sculpting in the master-barber tradition.' },
    { slug: 'facial', name: 'Facial & Skin Care', desc: 'Calibrated treatments for every skin type — purifying, hydrating, restoring.' },
    { slug: 'massage', name: 'Massage', desc: 'Deep-tissue, relaxation and recovery rituals from trained spa therapists.' },
    { slug: 'moroccan-bath', name: 'Moroccan Bath', desc: 'A heritage hammam ritual — exfoliation, steam and renewal.' },
    { slug: 'manicure-pedicure', name: 'Manicure & Pedicure', desc: 'Refined hand and foot care, executed with surgical-grade precision.' },
    { slug: 'hair-treatment', name: 'Hair Treatment', desc: 'Restorative protein, keratin and scalp therapies for healthier hair.' },
    { slug: 'grooming-packages', name: 'Grooming Packages', desc: 'Curated multi-service rituals for a complete reset.' }
  ],
  offers: [
    { name: '8 Services Signature Package', price: 250, list: ['Haircut', 'Beard Sculpt', 'Hair Wash', 'Hair Treatment', 'Express Facial', 'Head Massage', 'Manicure', 'Pedicure'], badge: 'Signature', branch: 'all' },
    { name: '6 Services Essential Package', price: 100, list: ['Haircut', 'Beard Trim', 'Hair Wash', 'Express Facial', 'Hand Care', 'Foot Care'], badge: 'Bestseller', branch: 'all' },
    { name: 'Moroccan Bath Ritual', price: 180, list: ['Steam Room', 'Black Soap Cleanse', 'Kessa Exfoliation', 'Hydrating Mask', 'Argan Oil Finish'], badge: 'Spa', branch: 'baniyas-spa' },
    { name: 'VIP Gentleman\'s Hour', price: 450, list: ['Private Suite', 'Master Barber Cut', 'Hot Towel Shave', 'Signature Facial', 'Refreshment Service'], badge: 'VIP', branch: 'vip-muroor' },
    { name: 'Eid Premium Package', price: 320, list: ['Haircut', 'Beard Sculpt', 'Moroccan Bath', 'Premium Facial', 'Manicure', 'Pedicure'], badge: 'Limited Time', branch: 'all' },
    { name: 'Father & Son Ritual', price: 220, list: ['Two Haircuts', 'Two Beard Trims (or Kids Style)', 'Hair Wash', 'Refreshments'], badge: 'Family', branch: 'all' }
  ]
};
