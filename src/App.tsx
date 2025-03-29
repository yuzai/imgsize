import './App.css';
import ImageEditor from './components/ImageEditor';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>图片编辑器</h1>
      </header>
      <main>
        <ImageEditor />
      </main>
      <footer>
        <p>图片上传、编辑与保存工具 © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default App;
