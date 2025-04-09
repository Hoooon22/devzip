import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  // TodoList 컴포넌트 스타일
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    minWidth: 60,
    minHeight: 48,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyList: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
  },
  
  // TodoItem 컴포넌트 스타일
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginBottom: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  todoCheckbox: {
    marginRight: 12,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 32,
    minHeight: 32,
  },
  todoText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  todoTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#9E9E9E',
  },
  todoDelete: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 32,
    minHeight: 32,
  },
});

// 반응형 스타일링을 위한 미디어 쿼리 적용
export const mediaStyles = {
  // 태블릿(768px 이상)
  tablet: width >= 768 ? {
    container: {
      padding: 24,
      maxWidth: 600,
      alignSelf: 'center',
      width: '100%',
    },
    title: {
      fontSize: 28,
    },
    input: {
      fontSize: 18,
      padding: 16,
    },
    addButton: {
      minWidth: 80,
    },
    todoItem: {
      padding: 16,
    },
  } : {},
  
  // 데스크톱(1024px 이상)
  desktop: width >= 1024 ? {
    container: {
      maxWidth: 800,
    },
    title: {
      fontSize: 32,
    },
  } : {},
  
  // 대형 화면(1440px 이상)
  largeScreen: width >= 1440 ? {
    container: {
      maxWidth: 1000,
    },
  } : {},
};

// 미디어 쿼리 스타일 병합
const mergedStyles = {};

Object.keys(styles).forEach(key => {
  mergedStyles[key] = {
    ...styles[key],
    ...mediaStyles.tablet[key],
    ...mediaStyles.desktop[key],
    ...mediaStyles.largeScreen[key],
  };
});

export default StyleSheet.create(mergedStyles);