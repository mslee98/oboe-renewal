import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Home from './pages/home'
import NotFound from './pages/OtherPage/NotFound'
import Oboe from './pages/Oboe/Oboe'
import CxArena from './pages/Oboe/CxArena'
import Editor from './pages/Oboe/Editor'
import Interior2ds from './pages/Interior2ds'
import Interior3DWithEditor from './pages/Interior3DWithEditor'

function App() {

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Home />} />

            <Route path="/oboe" element={<Oboe />} />
            <Route path="/cxarena" element={<CxArena />} />
            <Route path="/editor" element={<Editor />} />
            <Route path="/interior3d-editor" element={<Interior3DWithEditor />} />
            {/* <Route path="/serverroom" element={<ServerRoom />} /> */}

            <Route path="/interior2ds" element={<Interior2ds />} />


            <Route path="*" element={<NotFound />} />

          </Route>
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
