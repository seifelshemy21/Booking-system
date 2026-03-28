const form = document.getElementById('booking-form');
const list = document.getElementById('bookings-list');
const warning = document.getElementById('duplicate-warning');
const clearBtn = document.getElementById('clear-all');
const filterBtns = document.querySelectorAll('.filter-btn');

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
            return `
                    <div class="flex items-start justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-primary/20 hover:shadow-sm transition-all group">
                        <div class="flex gap-4">
                            <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                                <i data-lucide="user" class="w-5 h-5"></i>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-sm font-extrabold text-slate-800">${b.name}</span>
                                <span class="text-xs text-slate-400 font-medium">${formatDate(b.date)} • ${formatTime(b.time)}</span>
                            </div>
                        </div>
                        <span class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border ${colors}">
                            ${b.room}
                        </span>
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
        time: fd.get('time')
    };

    // Validation
    if (!booking.room || !booking.name || !booking.date || !booking.time) {
        alert("Please fill in all fields.");
        return;
    }

    try {
        // Double Booking Check (Supabase)
        const { data: existing, error: checkError } = await supabaseClient
            .from('bookings')
            .select('id')
            .eq('room', booking.room)
            .eq('date', booking.date)
            .eq('time', booking.time);

        if (checkError) throw checkError;

        if (existing && existing.length > 0) {
            warning.classList.remove('hidden');
            return;
        }

        // Save to Supabase
        const { error: insertError } = await supabaseClient
            .from('bookings')
            .insert([booking]);

        if (insertError) throw insertError;

        // UI feedback
        form.reset();
        render();

        // WhatsApp Message
        const msg = `*Room Reserved*\n\n*Room:* ${booking.room}\n*Date:* ${formatDate(booking.date)}\n*Time:* ${formatTime(booking.time)}\n*Reserved By:* ${booking.name}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');

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
                .neq('id', 0); // Common way to delete all rows

            if (error) throw error;
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

// --- Helpers ---
function formatDate(d) {
    const parts = d.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatTime(timeStr) {
    let [hour, minute] = timeStr.split(':');
    hour = parseInt(hour);
    const period = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${period}`;
}

// Initial render
render();

