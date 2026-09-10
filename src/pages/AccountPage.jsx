import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, updateProfile, updatePassword, isLoggedIn } from '../utils/auth';

export default function AccountPage() {
  const navigate = useNavigate();
  const [initialUser] = useState(() => getUser());
  const [user, setUser] = useState(initialUser);
  
  const [firstName, setFirstName] = useState(initialUser?.first_name || '');
  const [lastName, setLastName] = useState(initialUser?.last_name || '');
  const [profileMsg, setProfileMsg] = useState({ text: '', type: '' });
  const [profileLoading, setProfileLoading] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState({ text: '', type: '' });
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/');
      window.dispatchEvent(new Event('open-login-modal'));
      return;
    }
  }, [navigate]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!firstName || !lastName) {
      setProfileMsg({ text: 'Fields cannot be empty', type: 'error' });
      return;
    }
    setProfileLoading(true);
    setProfileMsg({ text: '', type: '' });
    const res = await updateProfile(firstName, lastName);
    setProfileLoading(false);
    if (res.ok) {
      setUser(res.user);
      setProfileMsg({ text: 'Profile updated successfully', type: 'success' });
      window.dispatchEvent(new Event('auth-change'));
    } else {
      setProfileMsg({ text: res.error || 'Failed to update profile', type: 'error' });
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPwdMsg({ text: 'Please fill all password fields', type: 'error' });
      return;
    }
    if (newPassword.length < 8) {
      setPwdMsg({ text: 'New password must be at least 8 characters', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdMsg({ text: 'New passwords do not match', type: 'error' });
      return;
    }
    setPwdLoading(true);
    setPwdMsg({ text: '', type: '' });
    const res = await updatePassword(oldPassword, newPassword);
    setPwdLoading(false);
    if (res.ok) {
      setPwdMsg({ text: 'Password updated successfully', type: 'success' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPwdMsg({ text: res.error || 'Failed to update password', type: 'error' });
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0A0C10] pt-24 pb-12 px-container-padding flex flex-col items-center relative overflow-hidden"
      style={{ backgroundImage: 'linear-gradient(to right,rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.04) 1px,transparent 1px)', backgroundSize: '80px 80px' }}>
      
      <div className="max-w-2xl w-full relative z-10">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-on-surface-variant hover:text-white font-mono text-xs uppercase tracking-widest transition-colors">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back
        </button>

        <div className="mb-10 border-b border-white/10 pb-6">
          <h1 className="font-mono text-3xl font-bold text-white tracking-widest uppercase mb-2">My Account</h1>
          <p className="font-mono text-sm text-[#dbc2ad]">{user.email}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Profile Section */}
          <div className="border border-white/10 bg-white/5 p-6 rounded-lg">
            <h2 className="font-mono text-lg text-white mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container">person</span>
              Profile Info
            </h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-2 uppercase tracking-widest font-mono">First Name</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-container transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-2 uppercase tracking-widest font-mono">Last Name</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-container transition-all" />
              </div>
              <button type="submit" disabled={profileLoading} className="w-full bg-white/10 text-white font-mono text-sm py-3 rounded-md hover:bg-white/20 transition-colors uppercase tracking-widest disabled:opacity-50 mt-2 border border-white/20">
                {profileLoading ? 'Saving...' : 'Update Profile'}
              </button>
              {profileMsg.text && (
                <div className={`mt-3 p-3 rounded text-xs text-center font-mono ${profileMsg.type === 'success' ? 'bg-green-500/10 text-[#a8e063] border border-green-500/20' : 'bg-red-500/10 text-[#f87171] border border-red-500/20'}`}>
                  {profileMsg.text}
                </div>
              )}
            </form>
          </div>

          {/* Password Section */}
          <div className="border border-white/10 bg-white/5 p-6 rounded-lg">
            <h2 className="font-mono text-lg text-white mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container">lock</span>
              Security
            </h2>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-2 uppercase tracking-widest font-mono">Current Password</label>
                <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-container transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-2 uppercase tracking-widest font-mono">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-container transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-2 uppercase tracking-widest font-mono">Confirm New</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-container transition-all" />
              </div>
              <button type="submit" disabled={pwdLoading} className="w-full bg-primary-container text-[#111] font-mono text-sm font-bold py-3 rounded-md hover:bg-[#ffb033] transition-colors uppercase tracking-widest disabled:opacity-50 mt-2">
                {pwdLoading ? 'Saving...' : 'Change Password'}
              </button>
              {pwdMsg.text && (
                <div className={`mt-3 p-3 rounded text-xs text-center font-mono ${pwdMsg.type === 'success' ? 'bg-green-500/10 text-[#a8e063] border border-green-500/20' : 'bg-red-500/10 text-[#f87171] border border-red-500/20'}`}>
                  {pwdMsg.text}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
