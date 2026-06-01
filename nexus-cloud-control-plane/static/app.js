const API_BASE = '/api/v1/instances';

// Fetch all instances from the database and display them
async function fetchInstances() {
    try {
        const response = await fetch(`${API_BASE}/list`);
        const result = await response.json();
        const listDiv = document.getElementById('instance-list');
        listDiv.innerHTML = ''; // Clear current list

        if (result.data.length === 0) {
            listDiv.innerHTML = '<p>No active instances. Deploy one to get started!</p>';
            return;
        }

        // Loop through the database records and build HTML cards
        result.data.forEach(instance => {
            const card = document.createElement('div');
            card.className = 'instance-card';
            card.innerHTML = `
                <div><strong>ID:</strong> ${instance.instance_id}</div>
                <div><strong>OS:</strong> ${instance.os_image}</div>
                <div><strong>RAM:</strong> ${instance.memory_limit}</div>
                <div><strong>Status:</strong> <span style="color: #4ade80;">${instance.status}</span></div>
                <button class="delete-btn" onclick="deleteInstance('${instance.instance_id}')">Terminate</button>
            `;
            listDiv.appendChild(card);
        });
    } catch (error) {
        console.error("Error fetching instances:", error);
    }
}

// Send a POST request to FastAPI to build a new server
async function deployInstance() {
    const btn = document.getElementById('deploy-btn');
    btn.innerText = 'Deploying...';
    btn.disabled = true;

    try {
        await fetch(`${API_BASE}/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                os_image: "ubuntu:latest", 
                memory_limit: "512m", 
                name_prefix: "nx" 
            })
        });
        // Refresh the UI once the server is built
        fetchInstances();
    } catch (error) {
        alert("Failed to deploy instance.");
    } finally {
        btn.innerText = 'Deploy New Instance';
        btn.disabled = false;
    }
}

// Send a DELETE request to FastAPI to wipe a server
async function deleteInstance(id) {
    if(!confirm(`Are you sure you want to terminate ${id}? This cannot be undone.`)) return;
    
    try {
        await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
        fetchInstances(); // Refresh the UI
    } catch (error) {
        alert("Failed to terminate instance.");
    }
}

// Attach the click event to the deploy button
document.getElementById('deploy-btn').addEventListener('click', deployInstance);

// Load the instances as soon as the page opens
fetchInstances();