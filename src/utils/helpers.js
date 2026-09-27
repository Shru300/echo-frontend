import { formatDistanceToNow } from 'date-fns';

export const formatDate = (date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const getPostTypeColor = (type) => {
  const colors = {
    post: 'bg-neutral-50 text-neutral-700 border border-neutral-100',
    announcement: 'bg-blue-50 text-blue-700 border border-blue-100',
    event: 'bg-purple-50 text-purple-700 border border-purple-100',
    poll: 'bg-green-50 text-green-700 border border-green-100',
    discussion: 'bg-orange-50 text-orange-700 border border-orange-100'
  };
  return colors[type] || 'bg-neutral-50 text-neutral-700 border border-neutral-100';
};

export const getPostTypeIcon = (type) => {
  const icons = {
    post: '📝',
    announcement: '📢',
    event: '📅',
    poll: '🗳️',
    discussion: '💬'
  };
  return icons[type] || '📝';
};

export const getRoleColor = (role) => {
  const colors = {
    admin: 'text-red-600',
    faculty: 'text-purple-600',
    student: 'text-blue-600'
  };
  return colors[role] || 'text-gray-600';
};

export const getRoleBadge = (role) => {
  const badges = {
    admin: 'bg-red-100 text-red-800',
    faculty: 'bg-purple-100 text-purple-800',
    student: 'bg-blue-100 text-blue-800'
  };
  return badges[role] || 'bg-gray-100 text-gray-800';
};

export const truncateText = (text, maxLength = 150) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const getAvatarFallback = (name) => {
  return name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';
};

