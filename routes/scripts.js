// Get script versions
router.get('/:id/versions', async (req, res) => {
    try {
        const script = await Script.findById(req.params.id);
        if (!script) return res.status(404).json({ error: 'Script not found' });
        
        // Only return active versions
        const activeVersions = script.versions
            .filter(v => v.isActive)
            .map(v => ({
                number: v.number,
                releaseDate: v.releaseDate,
                changes: v.changes
            }));
        
        res.json(activeVersions);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get download URL for specific version
router.get('/:id/download/:version', authenticateUser, async (req, res) => {
    try {
        const script = await Script.findById(req.params.id);
        if (!script) return res.status(404).json({ error: 'Script not found' });
        
        // Check if user has purchased the script
        const purchase = await Purchase.findOne({
            userId: req.user._id,
            scriptId: script._id,
            status: 'active'
        });
        
        if (!purchase) {
            return res.status(403).json({ error: 'Purchase required to download' });
        }
        
        const version = script.versions.find(
            v => v.number === req.params.version && v.isActive
        );
        
        if (!version) {
            return res.status(404).json({ error: 'Version not found or inactive' });
        }
        
        res.json({ downloadUrl: version.downloadUrl });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ดึงรายการเวอร์ชันที่เปิดใช้งาน
router.get('/api/scripts/:id/versions', async (req, res) => {
    try {
        const script = await Script.findById(req.params.id);
        if (!script) return res.status(404).json({ error: 'Script not found' });

        // ส่งเฉพาะเวอร์ชันที่เปิดใช้งาน
        const activeVersions = script.versions
            .filter(v => v.isActive)
            .map(v => ({
                number: v.number,
                releaseDate: v.releaseDate,
                changes: v.changes
            }));

        res.json(activeVersions);
    } catch (err) {
        console.error('Error fetching versions:', err);
        res.status(500).json({ error: 'Error fetching versions' });
    }
});

// ดาวน์โหลดเวอร์ชันที่ระบุ
router.get('/api/scripts/:scriptId/download/:version', authenticateUser, async (req, res) => {
    try {
        const script = await Script.findById(req.params.scriptId);
        if (!script) return res.status(404).json({ error: 'Script not found' });

        // ตรวจสอบการซื้อ
        const purchase = await Purchase.findOne({
            userId: req.user._id,
            scriptId: script._id,
            status: 'active'
        });

        if (!purchase) {
            return res.status(403).json({ error: 'Purchase required to download' });
        }

        // หาเวอร์ชันที่ต้องการ
        const version = script.versions.find(
            v => v.number === req.params.version && v.isActive
        );

        if (!version) {
            return res.status(404).json({ error: 'Version not found or inactive' });
        }

        res.json({ downloadUrl: version.downloadUrl });
    } catch (err) {
        console.error('Error processing download:', err);
        res.status(500).json({ error: 'Error processing download' });
    }
}); 