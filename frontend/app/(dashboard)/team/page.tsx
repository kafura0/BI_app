"use client";
import { useEffect, useState } from "react";
import { UserPlus, Trash2, RefreshCw, Shield, BarChart2, Eye, Mail, Clock } from "lucide-react";
import { teamApi, getErrorMessage, type TeamMember, type PendingInvite } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const ROLE_CONFIG = {
  admin: { label: "Admin", icon: Shield, color: "text-amber-400 bg-amber-400/10" },
  analyst: { label: "Analyst", icon: BarChart2, color: "text-indigo-400 bg-indigo-400/10" },
  viewer: { label: "Viewer", icon: Eye, color: "text-slate-400 bg-slate-700" },
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("analyst");
  const [inviting, setInviting] = useState(false);

  const load = async () => {
    try {
      const [membersRes, invitesRes] = await Promise.all([teamApi.listMembers(), teamApi.listInvites()]);
      setMembers(membersRes.data);
      setInvites(invitesRes.data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [membersRes, invitesRes] = await Promise.all([teamApi.listMembers(), teamApi.listInvites()]);
        if (cancelled) return;
        setMembers(membersRes.data);
        setInvites(invitesRes.data);
      } catch (e) {
        if (!cancelled) setError(getErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      await teamApi.invite(inviteEmail, inviteRole);
      setInviteEmail("");
      setShowInvite(false);
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeInvite = async (id: string) => {
    try {
      await teamApi.revokeInvite(id);
      setInvites((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      await teamApi.updateMemberRole(userId, role);
      setMembers((prev) => prev.map((m) => m.user_id === userId ? { ...m, role } : m));
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Remove this member from the organization?")) return;
    try {
      await teamApi.removeMember(userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Team</h1>
          <p className="text-slate-400 text-sm mt-0.5">{members.length} member{members.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Invite Member
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      {/* Invite form */}
      {showInvite && (
        <div className="mb-6 bg-slate-900 border border-indigo-600/30 rounded-xl p-5">
          <h3 className="text-white font-medium mb-4">Invite a team member</h3>
          <div className="flex gap-3 flex-wrap">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="flex-1 min-w-48 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="admin">Admin</option>
              <option value="analyst">Analyst</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={handleInvite}
              disabled={!inviteEmail || inviting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2"
            >
              {inviting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
              Send Invite
            </button>
            <button onClick={() => setShowInvite(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm rounded-lg transition-colors">
              Cancel
            </button>
          </div>
          <p className="text-slate-500 text-xs mt-2">An email invitation will be sent to the address above.</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" /></div>
      ) : (
        <>
          {/* Members */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-slate-800">
              <p className="text-slate-400 text-sm font-medium">Members</p>
            </div>
            {members.map((member, i) => {
              const roleConf = ROLE_CONFIG[member.role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.viewer;
              return (
                <div key={member.user_id} className={`flex items-center gap-4 px-5 py-4 ${i < members.length - 1 ? "border-b border-slate-800" : ""}`}>
                  <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-slate-300 text-sm font-medium uppercase">{member.full_name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{member.full_name}</p>
                    <p className="text-slate-500 text-xs">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.user_id, e.target.value)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${roleConf.color}`}
                    >
                      <option value="admin">Admin</option>
                      <option value="analyst">Analyst</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      className="text-slate-600 hover:text-red-400 transition-colors p-1"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pending invites */}
          {invites.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800">
                <p className="text-slate-400 text-sm font-medium">Pending Invitations</p>
              </div>
              {invites.map((invite, i) => (
                <div key={invite.id} className={`flex items-center gap-4 px-5 py-4 ${i < invites.length - 1 ? "border-b border-slate-800" : ""}`}>
                  <div className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 text-sm">{invite.email}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-600" />
                      <p className="text-slate-600 text-xs">Invited {formatDate(invite.created_at)}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full capitalize">{invite.role}</span>
                  <button
                    onClick={() => handleRevokeInvite(invite.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors p-1"
                    title="Revoke invite"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
