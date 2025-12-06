import re  
  
with open('app.js', 'r', encoding='utf-8') as f:  
    content = f.read()  
  
# Replace .map with .forEach  
content = content.replace("todoList.innerHTML = filteredTodos.map(todo =^>", "todoList.innerHTML = '';^n^n  filteredTodos.forEach(todo =^>")  
  
# Remove the .reduce().innerHTML part and replace with direct appendChild  
content = content.replace("  }.reduce((container, element) =^> {^n    container.appendChild(element);^n    return container;^n  }, document.createElement('div')).innerHTML;", "    todoList.appendChild(div);^n  });")  
  
with open('app.js', 'w', encoding='utf-8') as f:  
    f.write(content)  
  
print('Fixed!') 
