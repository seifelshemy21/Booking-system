const form = document.getElementById('booking-form');
const list = document.getElementById('bookings-list');
const warning = document.getElementById('duplicate-warning');
const clearBtn = document.getElementById('clear-all');
const filterBtns = document.querySelectorAll('.filter-btn');
const cancelEditBtn = document.getElementById('cancel-edit');
const submitText = document.getElementById('submit-text');
const bookingIdInput = document.getElementById('booking-id');
const warningMessage = document.getElementById('warning-message');
const officeForm = document.getElementById('office-request-form');
const officeList = document.getElementById('office-list');
const officeSuccess = document.getElementById('office-success');
const officeIdInput = document.getElementById('office-id');
const officeSubmitText = document.getElementById('office-submit-text');
const cancelEditOfficeBtn = document.getElementById('cancel-edit-office');

// Tabs
const tabBookings = document.getElementById('tab-bookings');
const tabOffice = document.getElementById('tab-office');
const sectionBookings = document.getElementById('section-bookings');
const sectionOffice = document.getElementById('section-office');

// Supabase Connection
const supabaseUrl = "https://zarwbbluypiwvlndhatf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphcndiYmx1eXBpd3ZsbmRoYXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2OTQ0MzgsImV4cCI6MjA5MDI3MDQzOH0.ZIhw9aQXak6n5h1BneX1HuYSmF7uKnd2OWSi5Vwebjo";
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let currentFilter = 'All';

// Room color map for UI
const ROOM_COLORS = {
    'Micron': 'bg-blue-50 text-blue-600 border-blue-100',
    'Phimton': 'bg-purple-50 text-purple-600 border-purple-100',
    'Meeting Room': 'bg-amber-50 text-amber-600 border-amber-100',
    'Median': 'bg-amber-50 text-amber-600 border-amber-100',
    'Eclipse': 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'Overlook': 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'Andalusian': 'bg-emerald-50 text-emerald-600 border-emerald-100',
};

// Initialize Icons
lucide.createIcons();

// --- Render function ---
async function render() {
    try {
        const { data: bookings, error } = await supabaseClient
            .from('bookings')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log("Total Bookings from DB:", bookings);

        const filtered = currentFilter === 'All'
            ? bookings
            : (bookings || []).filter(b => b.room === currentFilter);

        console.log("Filtered Bookings:", filtered);

        if (!filtered || filtered.length === 0) {
            list.innerHTML = `
                        <div class="text-center py-10 opacity-30 select-none">
                            <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-2 text-slate-300"></i>
                            <p class="text-sm font-bold uppercase tracking-widest text-slate-500">Empty Record</p>
                        </div>
                    `;
            lucide.createIcons();
            return;
        }

        list.innerHTML = filtered.map(b => createBookingElement(b)).join('');

        lucide.createIcons();
    } catch (error) {
        console.error("Fetch Error:", error.message);
    }
}

// --- Dynamic Realtime UI Addition ---
function addBookingToUI(booking) {
    if (!booking) return;

    // Check if it matches existing filter
    if (currentFilter !== 'All' && booking.room !== currentFilter) {
        return;
    }

    // Handle potential duplicate (e.g. if render was called nearly at same time)
    if (document.querySelector(`[data-id="${booking.id}"]`)) {
        return;
    }

    // Get the HTML
    const bookingHtml = createBookingElement(booking);

    // If list currently says "Empty Record", clear it first
    if (list.querySelector('.opacity-30')) {
        list.innerHTML = '';
    }

    // Prepend to top
    list.insertAdjacentHTML('afterbegin', bookingHtml);

    // Re-init icons only for the new element to save performance
    lucide.createIcons();
}

// --- Helper: Generate Booking HTML ---
function createBookingElement(b) {
    const colors = ROOM_COLORS[b.room] || 'bg-slate-50 text-slate-600 border-slate-100';
    // Resilient time extraction
    const startTime = b.start_time || b.time || "00:00";
    const endTime = b.end_time || (b.time ? formatTimeAddHour(b.time) : "00:00");

    const attendanceBtn = b.attended
        ? `<button onclick="handleToggleAttendance('${b.id}', true)" 
                class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold hover:bg-emerald-100 transition-all border border-emerald-100/50 shadow-sm shadow-emerald-100/20 active:scale-95 group/btn">
            <i data-lucide="check" class="w-3.5 h-3.5 stroke-[3]"></i>
            <span>ARRIVED</span>
           </button>`
        : `<button onclick="handleToggleAttendance('${b.id}', false)" 
                class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-extrabold hover:bg-rose-100 transition-all border border-rose-100/50 shadow-sm shadow-rose-100/20 active:scale-95 group/btn">
            <i data-lucide="x" class="w-3.5 h-3.5 stroke-[3]"></i>
            <span>NOT ARRIVED</span>
           </button>`;

    return `
            <div data-id="${b.id}" class="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 bg-white border border-slate-100 rounded-2xl hover:border-primary/20 hover:shadow-sm transition-all group">
                <div class="flex gap-3 sm:gap-4 items-start sm:items-center overflow-hidden w-full sm:w-auto">
                    <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                        <i data-lucide="user" class="w-5 h-5"></i>
                    </div>
                    <div class="flex flex-col min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="text-sm font-extrabold text-slate-800 truncate">${b.name}</span>
                            <span class="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter border ${colors}">
                                ${b.room}
                            </span>
                        </div>
                        <span class="text-xs text-slate-400 font-medium truncate">${formatDate(b.date)} • ${formatTime(startTime)} → ${formatTime(endTime)}</span>
                        ${b.note ? `<div class="text-xs text-slate-500 mt-1 flex items-start gap-1"><i data-lucide="file-text" class="w-3.5 h-3.5 mt-0.5 opacity-70 flex-shrink-0"></i><span class="flex-1 line-clamp-2" title="${b.note.replace(/\"/g, '&quot;')}">${b.note}</span></div>` : ''}
                    </div>
                </div>
                
                <div class="flex items-center justify-between sm:justify-end gap-2 transition-opacity w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t border-slate-50 sm:border-t-0">
                    ${attendanceBtn}
                    <div class="flex items-center">
                        <div class="h-8 w-px bg-slate-100 mx-1 hidden sm:block"></div>
                        <button onclick="handleEdit('${b.id}', \`${b.name.replace(/`/g, '\\`')}\`, \`${b.room.replace(/`/g, '\\`')}\`, '${b.date}', '${startTime}', '${endTime}', \`${(b.note || '').replace(/`/g, '\\`')}\`)" 
                            class="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all" title="Edit">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                        </button>
                        <button onclick="handleDelete('${b.id}')" 
                            class="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Delete">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>
            `;
}

// --- Submit Logic ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    warning.classList.add('hidden');

    const fd = new FormData(form);
    const booking = {
        room: fd.get('room'),
        name: fd.get('name').trim(),
        date: fd.get('date'),
        start_time: fd.get('start_time'),
        end_time: fd.get('end_time'),
        note: fd.get('note') ? fd.get('note').trim() : null
    };

    // Basic Field Validation
    if (!booking.room || !booking.name || !booking.date || !booking.start_time || !booking.end_time) {
        alert("Please fill in all fields.");
        return;
    }

    // Logical Time Check
    if (booking.start_time >= booking.end_time) {
        alert("End time must be after start time.");
        return;
    }

    try {
        const id = fd.get('id');
        const isEdit = !!id;

        // Overlap Check (Supabase)
        // Rule: (existing_start < new_end) AND (existing_end > new_start)
        let query = supabaseClient
            .from('bookings')
            .select('id')
            .eq('room', booking.room)
            .eq('date', booking.date)
            .lt('start_time', booking.end_time)
            .gt('end_time', booking.start_time);

        if (isEdit) {
            query = query.neq('id', id);
        }

        const { data: existing, error: checkError } = await query;

        if (checkError) throw checkError;

        if (existing && existing.length > 0) {
            warningMessage.innerText = "This room is already reserved for this time range.";
            warning.classList.remove('hidden');
            return;
        }

        if (isEdit) {
            // Update Supabase
            const { error: updateError } = await supabaseClient
                .from('bookings')
                .update(booking)
                .eq('id', id);

            if (updateError) throw updateError;
        } else {
            // Save to Supabase
            const { error: insertError } = await supabaseClient
                .from('bookings')
                .insert([booking]);

            if (insertError) throw insertError;
        }

        // UI feedback
        cancelEdit(); // Reset form and mode
        render();

        // WhatsApp Message
        const actionText = isEdit ? "Updated" : "Reserved";
        const noteStr = booking.note ? `\n*Note:* ${booking.note}` : "";
        const msg = `*Room ${actionText}*\n\n*Room:* ${booking.room}\n*Date:* ${formatDate(booking.date)}\n*Time:* ${formatTime(booking.start_time)} → ${formatTime(booking.end_time)}\n*By:* ${booking.name}${noteStr}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;

        // iOS compatibility fix: window.open is often blocked after async tasks.
        // On mobile/iOS, direct location change is more reliable.
        if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            window.location.href = whatsappUrl;
        } else {
            window.open(whatsappUrl, '_blank');
        }

    } catch (error) {
        console.error("Booking Error:", error.message);
        alert("Failed to save booking. Check console for details.");
    }
});

// --- Filter Logic ---
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
            b.classList.remove('active-filter', 'bg-white', 'text-slate-800');
            b.classList.add('text-slate-500', 'hover:bg-white');
        });

        btn.classList.add('active-filter');
        btn.classList.remove('text-slate-500', 'hover:bg-white');

        currentFilter = btn.getAttribute('data-room');
        render();
    });
});

// --- Tab Logic ---
const switchTab = (tab) => {
    if (tab === 'bookings') {
        sectionBookings.classList.remove('hidden');
        sectionOffice.classList.add('hidden');
        tabBookings.classList.add('bg-white', 'text-slate-800', 'shadow-sm');
        tabBookings.classList.remove('text-slate-500');
        tabOffice.classList.remove('bg-white', 'text-slate-800', 'shadow-sm');
        tabOffice.classList.add('text-slate-500');
        render();
    } else {
        sectionBookings.classList.add('hidden');
        sectionOffice.classList.remove('hidden');
        tabOffice.classList.add('bg-white', 'text-slate-800', 'shadow-sm');
        tabOffice.classList.remove('text-slate-500');
        tabBookings.classList.remove('bg-white', 'text-slate-800', 'shadow-sm');
        tabBookings.classList.add('text-slate-500');
        renderOfficeRequests();
    }
};

tabBookings.addEventListener('click', () => switchTab('bookings'));
tabOffice.addEventListener('click', () => switchTab('office'));

// --- Office Request Logic ---
officeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(officeForm);
    const request = {
        room_name: fd.get('room_name').trim(),
        client_name: fd.get('client_name').trim(),
        phone: fd.get('phone').trim(),
        note: fd.get('note') ? fd.get('note').trim() : null
    };

    try {
        const id = fd.get('id');
        const isEdit = !!id;

        if (isEdit) {
            const { error } = await supabaseClient
                .from('office_requests')
                .update(request)
                .eq('id', id);

            if (error) throw error;
        } else {
            const { error } = await supabaseClient
                .from('office_requests')
                .insert([request]);

            if (error) throw error;
        }

        cancelEditOffice();
        officeSuccess.classList.remove('hidden');
        setTimeout(() => officeSuccess.classList.add('hidden'), 3000);
        renderOfficeRequests();
    } catch (error) {
        console.error("Office Request Error:", error.message);
        alert("Failed to save request.");
    }
});

async function renderOfficeRequests() {
    try {
        const { data: requests, error } = await supabaseClient
            .from('office_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!requests || requests.length === 0) {
            officeList.innerHTML = `
                <div class="text-center py-10 opacity-30 select-none">
                    <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-2 text-slate-300"></i>
                    <p class="text-sm font-bold uppercase tracking-widest text-slate-500">No Requests</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        officeList.innerHTML = requests.map(r => `
            <div class="p-4 bg-white border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-primary/20 transition-all">
                <div class="flex flex-col overflow-hidden w-full sm:w-auto flex-1">
                    <div class="flex flex-wrap items-center gap-2 mb-1">
                        <span class="text-sm font-extrabold text-slate-800 truncate">${r.client_name}</span>
                        <span class="px-2 py-0.5 rounded-md text-[8px] font-black uppercase border border-slate-100 bg-slate-50 text-slate-500">
                            ${r.room_name}
                        </span>
                    </div>
                    <span class="text-[10px] text-slate-400 font-medium truncate">${r.phone} • ${new Date(r.created_at).toLocaleDateString()}</span>
                    ${r.note ? `<div class="text-xs text-slate-500 mt-1 flex items-start gap-1"><i data-lucide="file-text" class="w-3.5 h-3.5 mt-0.5 opacity-70 flex-shrink-0"></i><span class="flex-1 line-clamp-2" title="${r.note.replace(/\"/g, '&quot;')}">${r.note}</span></div>` : ''}
                </div>
                <div class="flex items-center justify-end gap-1 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t border-slate-50 sm:border-t-0">
                    <button onclick="handleEditOffice('${r.id}', \`${(r.room_name || '').replace(/`/g, '\\`')}\`, \`${(r.client_name || '').replace(/`/g, '\\`')}\`, '${r.phone}', \`${(r.note || '').replace(/`/g, '\\`')}\`)" 
                        class="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all" title="Edit">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                    <button onclick="handleDeleteOffice('${r.id}')" 
                        class="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Delete">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `).join('');
        lucide.createIcons();
    } catch (error) {
        console.error("Fetch Office Error:", error.message);
    }
}

// --- Clear All Logic ---
clearBtn.addEventListener('click', async () => {
    if (confirm("Permanently clear all booking history? This cannot be undone.")) {
        try {
            const { error } = await supabaseClient
                .from('bookings')
                .delete()
                .not('id', 'is', null);

            if (error) {
                alert("Failed to clear bookings: " + error.message);
                throw error;
            }
            render();
        } catch (error) {
            console.error("Clear Error:", error.message);
        }
    }
});

// --- Realtime Subscription ---
supabaseClient
    .channel('public:bookings')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, (payload) => {
        addBookingToUI(payload.new);
    })
    .subscribe();

// Realtime Office Requests
supabaseClient
    .channel('public:office_requests')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'office_requests' }, (payload) => {
        renderOfficeRequests();
    })
    .subscribe();

// --- Action Handlers (Global for onclick) ---
window.handleDelete = async (id) => {
    if (confirm("Delete this booking?")) {
        try {
            const { error } = await supabaseClient
                .from('bookings')
                .delete()
                .eq('id', id);

            if (error) throw error;
            // render() will be called by realtime listener or manually
            render();
        } catch (error) {
            console.error("Delete Error:", error.message);
        }
    }
};

window.handleToggleAttendance = async (id, currentStatus) => {
    try {
        const { error } = await supabaseClient
            .from('bookings')
            .update({ attended: !currentStatus })
            .eq('id', id);

        if (error) throw error;
        render();
    } catch (error) {
        console.error("Attendance Toggle Error:", error.message);
    }
};

window.handleEdit = (id, name, room, date, startTime, endTime, note) => {
    bookingIdInput.value = id;
    document.getElementById('user-name').value = name;
    document.getElementById('room-select').value = room;
    document.getElementById('booking-date').value = date;
    document.getElementById('start-time').value = startTime;
    document.getElementById('end-time').value = endTime;
    document.getElementById('booking-note').value = note && note !== 'null' ? note : '';

    submitText.innerText = "Save Changes";
    cancelEditBtn.classList.remove('hidden');

    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function cancelEdit() {
    form.reset();
    bookingIdInput.value = '';
    submitText.innerText = "Send Booking";
    cancelEditBtn.classList.add('hidden');
    warning.classList.add('hidden');
}

cancelEditBtn.addEventListener('click', cancelEdit);

// --- Helpers ---
function formatDate(d) {
    const parts = d.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatTime(timeStr) {
    if (!timeStr) return "N/A";
    try {
        let [hour, minute] = timeStr.split(':');
        hour = parseInt(hour);
        const period = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        return `${hour}:${minute.substring(0, 2)} ${period}`;
    } catch (e) {
        return timeStr;
    }
}

function formatTimeAddHour(timeStr) {
    if (!timeStr) return "00:00";
    try {
        let [hour, minute] = timeStr.split(':');
        let newHour = (parseInt(hour) + 1) % 24;
        return `${newHour.toString().padStart(2, '0')}:${minute}`;
    } catch (e) {
        return timeStr;
    }
}

// --- Office Action Handlers ---
window.handleDeleteOffice = async (id) => {
    if (confirm("Delete this office request?")) {
        try {
            const { error } = await supabaseClient
                .from('office_requests')
                .delete()
                .eq('id', id);

            if (error) throw error;
            renderOfficeRequests();
        } catch (error) {
            console.error("Delete Office Error:", error.message);
        }
    }
};

window.handleEditOffice = (id, room, name, phone, note) => {
    officeIdInput.value = id;
    document.getElementById('off-room-name').value = room;
    document.getElementById('off-client-name').value = name;
    document.getElementById('off-phone').value = phone;
    document.getElementById('off-note').value = note && note !== 'null' ? note : '';

    officeSubmitText.innerText = "Save Changes";
    cancelEditOfficeBtn.classList.remove('hidden');

    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function cancelEditOffice() {
    officeForm.reset();
    officeIdInput.value = '';
    officeSubmitText.innerText = "Submit Request";
    cancelEditOfficeBtn.classList.add('hidden');
}

cancelEditOfficeBtn.addEventListener('click', cancelEditOffice);

// Initial render
render();

