import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import TodoItem from './TodoItem';
import styles from './styles';

const Todo = () => {
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState('');
  
  // 로컬 스토리지에서 할 일 목록 불러오기
  useEffect(() => {
    const loadTodos = async () => {
      try {
        const storedTodos = localStorage.getItem('todos');
        if (storedTodos) {
          setTodos(JSON.parse(storedTodos));
        }
      } catch (error) {
        console.error('할 일 목록을 불러오는 중 오류 발생:', error);
      }
    };
    
    loadTodos();
  }, []);
  
  // 할 일 목록 저장
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);
  
  // 새 할 일 추가
  const addTodo = () => {
    if (text.trim()) {
      const newTodo = {
        id: Date.now().toString(),
        text: text.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
      };
      
      setTodos([...todos, newTodo]);
      setText('');
    }
  };
  
  // 할 일 완료 상태 토글
  const toggleTodo = (id) => {
    setTodos(
      todos.map(todo => 
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };
  
  // 할 일 삭제
  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>할 일 목록</Text>
      </View>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="할 일을 입력하세요"
          value={text}
          onChangeText={setText}
          onSubmitEditing={addTodo}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={addTodo}
          accessibilityLabel="할 일 추가하기"
          accessibilityRole="button"
        >
          <Text style={styles.addButtonText}>추가</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={todos}
        renderItem={({ item }) => (
          <TodoItem
            todo={item}
            onToggle={() => toggleTodo(item.id)}
            onDelete={() => deleteTodo(item.id)}
          />
        )}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </KeyboardAvoidingView>
  );
};

export default Todo;