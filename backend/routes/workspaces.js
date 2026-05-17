const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/workspaceController');
const { authenticate, requireOwner, requireMember } = require('../middleware/auth');

router.use(authenticate);

router.get('/search', ctrl.searchWorkspaces);
router.post('/', ctrl.createWorkspace);
router.post('/join-request', ctrl.requestToJoin);
router.post('/accept-invite/:token', ctrl.acceptInvite);

router.get('/:workspaceId', requireMember, ctrl.getWorkspace);
router.delete('/:workspaceId', requireOwner, ctrl.deleteWorkspace);
router.post('/:workspaceId/invite', requireOwner, ctrl.inviteEmployee);
router.get('/:workspaceId/join-requests', requireOwner, ctrl.getJoinRequests);
router.put('/:workspaceId/join-requests/:requestId', requireOwner, ctrl.handleJoinRequest);
router.delete('/:workspaceId/members/:userId', requireOwner, ctrl.removeMember);
router.put('/:workspaceId/members/:userId/role', requireOwner, ctrl.updateMemberRole);

module.exports = router;