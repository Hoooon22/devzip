import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  AccessibilityInfo 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TodoItem from './TodoItem';
import styles from './styles';

const TodoList = () => {
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  // 할 일 추가 함수
  const addTodo = () => {
    if (text.trim() === '') return;
    
    const newTodo = {
      id: Date.now().toString(),
      text: text.trim(),
      completed: false,
    };
    
    setTodos([...todos, newTodo]);
    setText('');
    
    // 접근성 알림
    AccessibilityInfo.announceForAccessibility('할 일이 추가되었습니다');
  };

  // 할 일 삭제 함수
  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
    
    // 접근성 알림
    AccessibilityInfo.announceForAccessibility('할 일이 삭제되었습니다');
  };

  // 할 일 완료 상태 토글 함수
  const toggleTodo = (id) => {
    setTodos(
      todos.map(todo => 
        todo.id === id 
          ? { ...todo, completed: !todo.completed } 
          : todo
      )
    );
    
    // 접근성 알림
    const todo = todos.find(todo => todo.id === id);
    const status = todo?.completed ? '미완료로 변경되었습니다' : '완료로 변경되었습니다';
    AccessibilityInfo.announceForAccessibility(status);
  };

  // 할 일 목록이 비어있을 때 표시할 컴포넌트
  const EmptyList = () => (
    <View style={styles.emptyContainer} accessible={true} accessibilityLabel="할 일 목록이 비어있습니다">
      <Ionicons name="list-outline" size={48} color="#BDBDBD" style={styles.emptyIcon} />
      <Text style={styles.emptyText}>할 일을 추가해보세요!</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <View style={styles.titleContainer}>
        <Text style={styles.title} accessibilityRole="header">할 일 목록</Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="할 일을 입력하세요"
          value={text}
          onChangeText={setText}
          returnKeyType="done"
          onSubmitEditing={addTodo}
          accessibilityLabel="할 일 입력"
          accessibilityHint="할 일을 입력하고 추가 버튼을 누르거나 엔터를 누르세요"
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={addTodo}
          activeOpacity={0.7}
          accessibilityLabel="할 일 추가"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        <FlatList
          data={todos}
          renderItem={({ item }) => (
            <TodoItem
              item={item}
              onToggle={() => toggleTodo(item.id)}
              onDelete={() => deleteTodo(item.id)}
            />
          )}
          keyExtractor={item => item.id}
          ListEmptyComponent={<EmptyList />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

export default TodoList;