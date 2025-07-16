// types/index.ts

export interface NavItem {
    path: string;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }
  
  export interface User {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  }
  
  export interface SideNavProps {
    user?: User;
    className?: string;
  }
  
  export interface NavLinkProps {
    to: string;
    children: React.ReactNode;
    isActive?: boolean;
    className?: string;
  }