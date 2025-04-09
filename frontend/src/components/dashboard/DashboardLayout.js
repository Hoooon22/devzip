import React, { useState } from 'react';
import styled from 'styled-components';

const Layout = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  
  @media (min-width: 1024px) {
    flex-direction: row;
  }
`;

const Sidebar = styled.aside`
  background-color: #1e293b;
  color: #fff;
  width: 100%;
  transition: all 0.3s ease;
  overflow-y: auto;
  
  @media (min-width: 1024px) {
    width: 280px;
    height: 100vh;
    position: sticky;
    top: 0;
  }
`;

const SidebarHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  @media (min-width: 1024px) {
    justify-content: center;
  }
`;

const Logo = styled.div`
  font-size: 24px;
  font-weight: bold;
  color: #fff;
`;

const MobileMenuToggle = styled.button`
  background: none;
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  display: block;
  
  @media (min-width: 1024px) {
    display: none;
  }
`;

const SidebarContent = styled.div`
  padding: 20px 0;
`;

const SidebarMenu = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const SidebarMenuItem = styled.li`
  margin: 8px 0;
`;

const SidebarLink = styled.a`
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: ${props => props.active ? '#fff' : 'rgba(255, 255, 255, 0.7)'};
  background-color: ${props => props.active ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
  border-left: ${props => props.active ? '4px solid #4a6cf7' : '4px solid transparent'};
  text-decoration: none;
  transition: all 0.2s;
  min-height: 44px;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
`;

const SidebarIcon = styled.span`
  display: inline-block;
  width: 24px;
  height: 24px;
  margin-right: 12px;
`;

const Main = styled.main`
  flex: 1;
  padding: 20px;
  background-color: #f1f5f9;
  
  @media (min-width: 768px) {
    padding: 30px;
  }
  
  @media (min-width: 1024px) {
    padding: 40px;
  }
`;

const DashboardHeader = styled.header`
  margin-bottom: 30px;
`;

const PageTitle = styled.h1`
  font-size: 24px;
  color: #0f172a;
  margin-bottom: 10px;
  
  @media (min-width: 768px) {
    font-size: 28px;
  }
  
  @media (min-width: 1024px) {
    font-size: 32px;
  }
`;

const PageDescription = styled.p`
  color: #64748b;
  font-size: 16px;
  
  @media (min-width: 768px) {
    font-size: 18px;
  }
`;

const DashboardLayout = ({ children, title, description }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  const menuItems = [
    { name: '대시보드', icon: '📊', path: '/dashboard', active: true },
    { name: '방문자 분석', icon: '👥', path: '/dashboard/visitors' },
    { name: '페이지 분석', icon: '📄', path: '/dashboard/pages' },
    { name: '이벤트 분석', icon: '🔍', path: '/dashboard/events' },
    { name: '설정', icon: '⚙️', path: '/dashboard/settings' },
  ];

  return (
    <Layout>
      <Sidebar style={{ display: isMobileMenuOpen ? 'block' : 'none' }}>
        <SidebarHeader>
          <Logo>TraceBoard</Logo>
          <MobileMenuToggle onClick={toggleMobileMenu} aria-label="메뉴 닫기">
            ✕
          </MobileMenuToggle>
        </SidebarHeader>
        
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item, index) => (
              <SidebarMenuItem key={index}>
                <SidebarLink 
                  href={item.path} 
                  active={item.active}
                  aria-current={item.active ? 'page' : undefined}
                >
                  <SidebarIcon>{item.icon}</SidebarIcon>
                  {item.name}
                </SidebarLink>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      
      <Main>
        <MobileMenuToggle 
          onClick={toggleMobileMenu} 
          style={{ display: isMobileMenuOpen ? 'none' : 'block', margin: '0 0 20px' }}
          aria-label="메뉴 열기"
        >
          ☰
        </MobileMenuToggle>
        
        <DashboardHeader>
          <PageTitle>{title || '대시보드'}</PageTitle>
          {description && <PageDescription>{description}</PageDescription>}
        </DashboardHeader>
        
        {children}
      </Main>
    </Layout>
  );
};

export default DashboardLayout;