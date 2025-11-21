const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let serverReports = [];
let totalSearches = 0;

app.get('/', (req, res) => {
    res.json({
        status: 'ONLINE',
        message: 'Brainrot Finder API',
        version: '1.0.0',
        totalReports: serverReports.length,
        totalSearches: totalSearches
    });
});

app.post('/api/report', (req, res) => {
    try {
        const { jobId, petName, value, playerName } = req.body;
        
        if (!jobId || !petName || value === undefined) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }
        
        const report = {
            jobId: String(jobId),
            petName: String(petName),
            value: parseFloat(value),
            playerName: playerName || 'Anonymous',
            timestamp: Date.now()
        };
        
        const now = Date.now();
        serverReports = serverReports.filter(r => now - r.timestamp < 600000);
        serverReports.push(report);
        
        console.log('Report received:', petName, value);
        
        res.json({ 
            success: true,
            totalReports: serverReports.length
        });
        
    } catch (error) {
        console.error('Error in report:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

app.get('/api/search', (req, res) => {
    try {
        const { pet, minValue } = req.query;
        
        totalSearches++;
        
        if (!pet) {
            return res.status(400).json({ 
                found: false, 
                error: 'Missing pet parameter' 
            });
        }
        
        const minVal = parseFloat(minValue) || 0;
        const now = Date.now();
        
        serverReports = serverReports.filter(r => now - r.timestamp < 600000);
        
        const matches = serverReports.filter(r => {
            const nameMatch = r.petName.toLowerCase().includes(pet.toLowerCase());
            const valueMatch = r.value >= minVal;
            return nameMatch && valueMatch;
        });
        
        if (matches.length === 0) {
            return res.json({ 
                found: false,
                message: 'No servers found with that pet',
                totalReportsChecked: serverReports.length
            });
        }
        
        matches.sort((a, b) => b.value - a.value);
        
        const results = matches.slice(0, 10).map(r => ({
            jobId: r.jobId,
            petName: r.petName,
            value: r.value,
            playerName: r.playerName,
            minutesAgo: Math.floor((now - r.timestamp) / 60000)
        }));
        
        res.json({
            found: true,
            totalMatches: matches.length,
            results: results,
            bestServer: results[0]
        });
        
    } catch (error) {
        console.error('Error in search:', error);
        res.status(500).json({ found: false, error: 'Server error' });
    }
});

app.get('/api/reports', (req, res) => {
    const now = Date.now();
    serverReports = serverReports.filter(r => now - r.timestamp < 600000);
    
    res.json({
        totalReports: serverReports.length,
        reports: serverReports
    });
});

app.get('/api/stats', (req, res) => {
    const now = Date.now();
    serverReports = serverReports.filter(r => now - r.timestamp < 600000);
    
    const uniqueServers = new Set(serverReports.map(r => r.jobId)).size;
    
    res.json({
        totalReports: serverReports.length,
        uniqueServers: uniqueServers,
        totalSearches: totalSearches,
        uptime: Math.floor(process.uptime())
    });
});

app.delete('/api/clear', (req, res) => {
    const before = serverReports.length;
    serverReports = [];
    totalSearches = 0;
    
    res.json({
        success: true,
        reportsDeleted: before
    });
});

setInterval(() => {
    const before = serverReports.length;
    const now = Date.now();
    serverReports = serverReports.filter(r => now - r.timestamp < 600000);
    
    const cleaned = before - serverReports.length;
    if (cleaned > 0) {
        console.log('Cleaned', cleaned, 'old reports');
    }
}, 120000);

const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
    console.log('API Started');
    console.log('Port:', PORT);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});
