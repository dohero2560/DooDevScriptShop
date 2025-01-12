// เพิ่มเวอร์ชันใหม่
app.post('/api/admin/scripts/:id/versions', isAdmin, async (req, res) => {
    try {
        const script = await Script.findById(req.params.id);
        if (!script) return res.status(404).json({ error: 'Script not found' });

        const newVersion = {
            number: req.body.number,
            changes: req.body.changes,
            downloadUrl: req.body.downloadUrl
        };

        script.versions.push(newVersion);
        script.currentVersion = newVersion.number;
        await script.save();

        res.status(201).json(newVersion);
    } catch (err) {
        console.error('Error adding version:', err);
        res.status(500).json({ error: 'Error adding version' });
    }
});

// อัพเดทเวอร์ชัน
app.put('/api/admin/scripts/:scriptId/versions/:versionId', isAdmin, async (req, res) => {
    try {
        const script = await Script.findById(req.params.scriptId);
        if (!script) return res.status(404).json({ error: 'Script not found' });

        const version = script.versions.id(req.params.versionId);
        if (!version) return res.status(404).json({ error: 'Version not found' });

        version.changes = req.body.changes;
        version.downloadUrl = req.body.downloadUrl;
        version.isActive = req.body.isActive;

        await script.save();
        res.json(version);
    } catch (err) {
        console.error('Error updating version:', err);
        res.status(500).json({ error: 'Error updating version' });
    }
});

// ลบเวอร์ชัน
app.delete('/api/admin/scripts/:scriptId/versions/:versionId', isAdmin, async (req, res) => {
    try {
        const script = await Script.findById(req.params.scriptId);
        if (!script) return res.status(404).json({ error: 'Script not found' });

        script.versions = script.versions.filter(v => v._id.toString() !== req.params.versionId);
        await script.save();

        res.json({ message: 'Version deleted successfully' });
    } catch (err) {
        console.error('Error deleting version:', err);
        res.status(500).json({ error: 'Error deleting version' });
    }
}); 