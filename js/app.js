document.addEventListener("DOMContentLoaded", async () => {

    const m = document.getElementById("message");
    const seriesList = document.getElementById("seriesList");
    const seriesCount = document.getElementById("seriesCount");
    const liveCount = document.getElementById("liveCount");
    const deadCount = document.getElementById("deadCount");
    const feedCount = document.getElementById("feedCount");
    const alertBox = document.getElementById("alertBox");

    const { data: { user }, error } = await db.auth.getUser();

    if (error || !user) {
        location.href = "index.html";
        return;
    }

    userEmail.textContent = user.email;

    entryDate.value = new Date().toISOString().slice(0, 10);

    async function load() {

        const { data, error } = await db
            .from("series")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) {
            m.textContent = "Erreur : " + error.message;
            return;
        }

        render(data || []);
    }

    function render(a) {

        seriesList.innerHTML = "";

        let L = 0;
        let D = 0;
        let F = 0;
        let alert = "";

        a.forEach(s => {

            const d = Array.isArray(s.days) ? s.days : [];

            const dead = d.reduce(
                (x, y) => x + Number(y.deaths || 0),
                0
            );

            const feed = d.reduce(
                (x, y) => x + Number(y.feed || 0),
                0
            );

            const live = Math.max(
                0,
                Number(s.initial_birds) - dead
            );

            L += live;
            D += dead;
            F += feed;

            const day = Math.min(
                50,
                Math.max(
                    1,
                    Math.floor(
                        (new Date() -
                        new Date(s.entry_date + "T00:00:00"))
                        / 86400000
                    ) + 1
                )
            );

            if (day >= 7 && day <= 10) {
                alert =
                    "⚠️ Cette série approche du 10e jour : pensez à préparer la série suivante.";
            }

            const c = document.createElement("article");

            c.className = "card series-card";

            c.innerHTML = `
                <h3>Série ${esc(s.number)}</h3>

                <p>📅 Entrée : ${s.entry_date}</p>

                <p>📆 Jour : ${day}/50</p>

                <p>🐥 Vivants : ${live}</p>

                <p>💀 Morts : ${dead}</p>

                <p>🌾 Aliment : ${feed.toFixed(2)} kg</p>

                <a
                    class="btn primary full"
                    href="serie.html?id=${encodeURIComponent(s.id)}">
                    Voir la série
                </a>

                <button
                    class="danger full delete-series"
                    data-id="${s.id}"
                    data-number="${esc(s.number)}">
                    🗑️ Supprimer
                </button>
            `;

            seriesList.appendChild(c);
        });

        if (!a.length) {
            seriesList.innerHTML =
                '<div class="empty card">Aucune série pour le moment.</div>';
        }

        seriesCount.textContent = a.length;
        liveCount.textContent = L;
        deadCount.textContent = D;
        feedCount.textContent = F.toFixed(2) + " kg";

        alertBox.textContent = alert;
        alertBox.classList.toggle("hidden", !alert);

        // Boutons supprimer
        document.querySelectorAll(".delete-series").forEach(button => {

            button.addEventListener("click", async () => {

                const id = button.dataset.id;
                const number = button.dataset.number;

                const confirmation = confirm(
                    `Voulez-vous vraiment supprimer la série ${number} ?`
                );

                if (!confirmation) {
                    return;
                }

                m.textContent = "Suppression en cours...";

                const { error } = await db
                    .from("series")
                    .delete()
                    .eq("id", id)
                    .eq("user_id", user.id);

                if (error) {
                    console.error(error);
                    m.textContent =
                        "Erreur : " + error.message;
                    return;
                }

                m.textContent = "✅ Série supprimée.";

                await load();
            });
        });
    }

    // Ajouter une série
    seriesForm.onsubmit = async e => {

        e.preventDefault();

        const n = number.value.trim();
        const date = entryDate.value;
        const b = Number(initialBirds.value);

        if (!n || !date || b <= 0) {
            m.textContent =
                "Remplis correctement les champs.";
            return;
        }

        m.textContent = "Ajout en cours...";

        const { error } = await db
            .from("series")
            .insert({
                user_id: user.id,
                number: n,
                entry_date: date,
                initial_birds: b,
                days: []
            });

        if (error) {
            console.error(error);
            m.textContent =
                "Erreur : " + error.message;
            return;
        }

        m.textContent = "✅ Série ajoutée !";

        e.target.reset();

        entryDate.value =
            new Date().toISOString().slice(0, 10);

        await load();
    };

    // Déconnexion
    logout.onclick = async () => {

        await db.auth.signOut();

        location.href = "index.html";
    };

    // Chargement initial
    await load();
});


function esc(v) {

    return String(v).replace(
        /[&<>"']/g,
        c => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[c])
    );
}
