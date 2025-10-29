import Layout from "./Layout.jsx";

import Register from "./Register";

import Home from "./Home";

import Groups from "./Groups";

import Feed from "./Feed";

import Chat from "./Chat";

import Admin from "./Admin";

import Settings from "./Settings";

import ForgotPin from "./ForgotPin";

import Autentificare from "./Autentificare";

import Courses from "./Courses";
import GroupDetails from "./GroupDetails";
import TopMembri from "./TopMembri";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Register: Register,
    
    Home: Home,
    
    Groups: Groups,
    
    Feed: Feed,
    
    Chat: Chat,
    
    Admin: Admin,
    
    Settings: Settings,
    
    ForgotPin: ForgotPin,
    
    Autentificare: Autentificare,
    
    Courses: Courses,
    
    GroupDetails: GroupDetails,
    
    TopMembri: TopMembri,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

          const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
          const result = pageName || "Autentificare"; // Default to Autentificare instead of first page
          
          return result;
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Autentificare />} />
                
                
                <Route path="/Register" element={<Register />} />
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/Groups" element={<Groups />} />
                
                <Route path="/Feed" element={<Feed />} />
                
                <Route path="/Chat" element={<Chat />} />
                
                <Route path="/Admin" element={<Admin />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/ForgotPin" element={<ForgotPin />} />
                
                <Route path="/Autentificare" element={<Autentificare />} />
                
                <Route path="/Courses" element={<Courses />} />
                
                <Route path="/GroupDetails" element={<GroupDetails />} />
                
                <Route path="/TopMembri" element={<TopMembri />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}