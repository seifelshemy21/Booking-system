const form = document.getElementById('booking-form');
const list = document.getElementById('bookings-list');
const warning = document.getElementById('duplicate-warning');
const clearBtn = document.getElementById('clear-all');
const filterBtns = document.querySelectorAll('.filter-btn');
const cancelEditBtn = document.getElementById('cancel-edit');
const submitText = document.getElementById('submit-text');
const bookingIdInput = document.getElementById('booking-id');
const warningMessage = document.getElementById('warning-message');

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
    'Eclibs': 'bg-emerald-50 text-emerald-600 border-emerald-100'
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

        const filtered = currentFilter === 'All'
            ? bookings
            : (bookings || []).filter(b => b.room === currentFilter);

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

        list.innerHTML = filtered.map(b => {
            const colors = ROOM_COLORS[b.room] || 'bg-slate-50 text-slate-600 border-slate-100';
            // Resilient time extraction
            const startTime = b.start_time || b.time || "00:00";
            const endTime = b.end_time || (b.time ? formatTimeAddHour(b.time) : "00:00");

            return `
                    <div class="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-primary/20 hover:shadow-sm transition-all group">
                        <div class="flex gap-4">
                            <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                                <i data-lucide="user" class="w-5 h-5"></i>
                            </div>
                            <div class="flex flex-col">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-extrabold text-slate-800">${b.name}</span>
                                    <span class="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter border ${colors}">
                                        ${b.room}
                                    </span>
                                </div>
                                <span class="text-xs text-slate-400 font-medium">${formatDate(b.date)} • ${formatTime(startTime)} → ${formatTime(endTime)}</span>
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-1 transition-opacity">
                            <button onclick="handleEdit('${b.id}', '${b.name}', '${b.room}', '${b.date}', '${startTime}', '${endTime}')" 
                                class="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all" title="Edit">
                                <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>
                            <button onclick="handleDelete('${b.id}')" 
                                class="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Delete">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                    `;
        }).join('');

        lucide.createIcons();
    } catch (error) {
        console.error("Fetch Error:", error.message);
    }
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
        end_time: fd.get('end_time')
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
        const msg = `*Room ${actionText}*\n\n*Room:* ${booking.room}\n*Date:* ${formatDate(booking.date)}\n*Time:* ${formatTime(booking.start_time)} → ${formatTime(booking.end_time)}\n*By:* ${booking.name}`;
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
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        render();
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

window.handleEdit = (id, name, room, date, startTime, endTime) => {
    bookingIdInput.value = id;
    document.getElementById('user-name').value = name;
    document.getElementById('room-select').value = room;
    document.getElementById('booking-date').value = date;
    document.getElementById('start-time').value = startTime;
    document.getElementById('end-time').value = endTime;

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

// Initial render
render();

