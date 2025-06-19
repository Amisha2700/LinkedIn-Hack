import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';
import {
  Bars3Icon,
  BellIcon,
  XMarkIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Fragment, useState } from 'react';

const navigation = [
  { name: 'Home', href: '/', current: false },
  { name: 'Resume Analyzer', href: '/resume-analyzer', current: false },
  { name: 'Interview Simulator', href: '/technical-interview', current: false },
  { name: 'HR Round', href: '/hr-interview', current: false },
  { name: 'GD Practice', href: '/gd-rooms', current: false },
  { name: 'Resources', href: '/virtual-office', current: false },
];

const defaultNotifications = [
  'Your resume analysis is ready!',
  'Upcoming mock interview in 1 hour',
  'HR interview feedback available',
  'New GD Room invite from Rahul',
  'Work simulation: New task unlocked!',
];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Navbar() {
  const { isLoggedIn, setIsLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(defaultNotifications.map((_, i) => i));

  const handleNotificationClick = (index) => {
    setUnread((prev) => prev.filter((i) => i !== index));
  };

  return (
    <Disclosure as="nav" className="bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          {/* Mobile menu */}
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
            <DisclosureButton className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-white">
              <Bars3Icon className="block size-6 group-data-[open]:hidden" />
              <XMarkIcon className="hidden size-6 group-data-[open]:block" />
            </DisclosureButton>
          </div>

          {/* Logo & Navigation */}
          <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
            <div className="flex items-center">
              <img
                className="h-10 w-10 object-cover rounded-full ring-2 ring-indigo-500 shadow-md"
                src={logo}
                alt="InterviewVerse Logo"
              />
              <span className="ml-2 text-white text-lg font-semibold hidden sm:block">
                NextHire
              </span>
            </div>
            <div className="hidden sm:ml-6 sm:block">
              <div className="flex space-x-4">
                {navigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className={classNames(
                      item.current
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                      'rounded-md px-3 py-2 text-sm font-medium'
                    )}
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Right-side icons */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0 space-x-4">

            {/* Notification */}
            <Popover className="relative">
              <PopoverButton className="relative rounded-full bg-gray-900 p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white">
                <span className="sr-only">View notifications</span>
                <BellIcon className="h-6 w-6" />
                {isLoggedIn && unread.length > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                    {unread.length}
                  </span>
                )}
              </PopoverButton>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <PopoverPanel className="absolute right-0 z-10 mt-2 w-72 max-h-80 overflow-auto rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none">
                  <div className="py-2">
                    {!isLoggedIn ? (
                      <div className="px-4 py-3 text-sm text-center text-gray-700">
                        Please{' '}
                        <span
                          className="font-semibold text-indigo-600 cursor-pointer"
                          onClick={() => navigate('/signin')}
                        >
                          sign in
                        </span>{' '}
                        to view notifications.
                      </div>
                    ) : (
                      defaultNotifications.map((note, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleNotificationClick(idx)}
                          className={classNames(
                            'px-4 py-2 text-sm cursor-pointer hover:bg-gray-100',
                            unread.includes(idx)
                              ? 'text-gray-800 font-medium'
                              : 'text-gray-500'
                          )}
                        >
                          {note}
                        </div>
                      ))
                    )}
                  </div>
                </PopoverPanel>
              </Transition>
            </Popover>

            {/* Settings */}
            <button
              onClick={() => navigate('/setting')}
              className="relative rounded-full bg-gray-900 p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
            >
              <span className="sr-only">Settings</span>
              <Cog6ToothIcon className="h-6 w-6" />
            </button>

            {/* Profile dropdown */}
            {isLoggedIn && (
              <Menu as="div" className="relative ml-3">
                <div>
                  <MenuButton className="flex rounded-full bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2">
                    <img
                      className="h-8 w-8 rounded-full"
                      src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                      alt="User"
                    />
                  </MenuButton>
                </div>
                <MenuItems className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
                  <MenuItem>
                    {({ active }) => (
                      <a
                        href="/profile"
                        className={classNames(
                          active ? 'bg-gray-100' : '',
                          'block px-4 py-2 text-sm text-gray-700'
                        )}
                      >
                        Your Profile
                      </a>
                    )}
                  </MenuItem>
                  <MenuItem>
                    {({ active }) => (
                      <a
                        href="/setting"
                        className={classNames(
                          active ? 'bg-gray-100' : '',
                          'block px-4 py-2 text-sm text-gray-700'
                        )}
                      >
                        Settings
                      </a>
                    )}
                  </MenuItem>
                  <MenuItem>
                    {({ active }) => (
                      <button
                        onClick={() => {
                          setIsLoggedIn(false);
                          localStorage.removeItem('isLoggedIn');
                          window.location.href = '/';
                        }}
                        className={classNames(
                          active ? 'bg-gray-100' : '',
                          'block w-full text-left px-4 py-2 text-sm text-gray-700'
                        )}
                      >
                        Sign out
                      </button>
                    )}
                  </MenuItem>
                </MenuItems>
              </Menu>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      <DisclosurePanel className="sm:hidden">
        <div className="space-y-1 px-2 pt-2 pb-3">
          {navigation.map((item) => (
            <DisclosureButton
              key={item.name}
              as="a"
              href={item.href}
              className={classNames(
                item.current
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                'block rounded-md px-3 py-2 text-base font-medium'
              )}
            >
              {item.name}
            </DisclosureButton>
          ))}
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}
